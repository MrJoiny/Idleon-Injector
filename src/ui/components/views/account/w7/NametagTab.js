import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, button, span, h3, p } = van.tags;

const NAMETAG_COUNTS_PATH = "Spelunk[17]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";
const NAMETAG_KEY_PATTERN = /^EquipmentNametag(\d+)$/;

const getDef = (raw) => raw?.h ?? raw;

const getName = (itemId, raw) => {
    const def = getDef(raw);
    return (
        def?.displayName || def?.DisplayName || def?.name || def?.Name || def?.desc_line1 || def?.desc_line2 || itemId
    );
};

const cleanName = (name) =>
    String(name ?? "")
        .replace(/_/g, " ")
        .trim();

const clampAmount = (raw) => {
    const numeric = Math.round(Number(raw));
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
};

const buildNametagCatalog = (rawItemDefs) => {
    const itemDefs = rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {};

    return Object.entries(itemDefs)
        .map(([itemId, raw]) => {
            const match = itemId.match(NAMETAG_KEY_PATTERN);
            if (!match) return null;

            const def = getDef(raw);
            const nametagNumber = Number(match[1]);

            return {
                itemId,
                nametagNumber,
                name: cleanName(getName(itemId, raw)),
                defId: def?.ID ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.nametagNumber - b.nametagNumber);
};

const buildNametagRows = (catalog, rawCounts) => {
    const counts = toIndexedArray(rawCounts ?? []);

    return catalog.map((entry) => ({
        ...entry,
        amountState: van.state(clampAmount(counts[entry.nametagNumber] ?? 0)),
        inputVal: van.state(String(clampAmount(counts[entry.nametagNumber] ?? 0))),
    }));
};

const NametagRow = ({ row }) => {
    const { status, run } = useWriteStatus();

    const setAmount = async () => {
        const nextAmount = clampAmount(row.inputVal.val);

        await run(async () => {
            await writeGga(`${NAMETAG_COUNTS_PATH}[${row.nametagNumber}]`, nextAmount);
            row.amountState.val = nextAmount;
            row.inputVal.val = String(nextAmount);
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    "nametag-row",
                    status.val === "success" ? "flash-success" : "",
                    status.val === "error" ? "flash-error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, row.nametagNumber),
            div(
                { class: "nametag-row__name-group" },
                span({ class: "feature-row__name" }, row.name),
                span({ class: "nametag-row__item-id" }, row.itemId)
            )
        ),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: row.inputVal,
                oninput: (e) => (row.inputVal.val = e.target.value),
                onDecrement: () => (row.inputVal.val = String(Math.max(0, clampAmount(row.inputVal.val) - 1))),
                onIncrement: () => (row.inputVal.val = String(clampAmount(row.inputVal.val) + 1)),
            }),
            button(
                {
                    type: "button",
                    onmousedown: (e) => e.preventDefault(),
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading" || clampAmount(row.inputVal.val) === row.amountState.val,
                    onclick: setAmount,
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

export const NametagTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    let catalogCache = [];

    const load = async (showSpinner = true, forceDefsReload = false) => {
        if (showSpinner) loading.val = true;
        error.val = null;

        try {
            if (forceDefsReload || catalogCache.length === 0) {
                const rawItemDefs = await readGga(ITEM_DEFS_PATH);
                catalogCache = buildNametagCatalog(rawItemDefs);
            }

            const rawCounts = await readGga(NAMETAG_COUNTS_PATH);
            data.val = {
                rows: buildNametagRows(catalogCache, rawCounts),
            };
        } catch (e) {
            error.val = e?.message ?? "Failed to load nametag gallery data";
            data.val = null;
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    load(true, true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: (resolved) => resolved.rows.length === 0,
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO NAMETAGS FOUND",
                subtitle: "No EquipmentNametag item definitions were found in ItemDefinitionsGET.h.",
            }),
        renderContent: (resolved) =>
            div(
                { class: "nametag-gallery-scroll scrollable-panel" },
                div(
                    { class: "trophy-gallery-section" },
                    div(
                        { class: "trophy-gallery-section__header" },
                        span({ class: "trophy-gallery-section__title" }, "NAMETAG AMOUNTS"),
                        span(
                            { class: "trophy-gallery-section__note" },
                            `${resolved.rows.length} NAMETAGS FROM ITEM DEFINITIONS`
                        )
                    ),
                    div(
                        { class: "nametag-gallery-summary" },
                        span({ class: "nametag-gallery-summary__label" }, "Total Delivered"),
                        span({ class: "nametag-gallery-summary__value" }, () =>
                            resolved.rows.reduce((total, row) => total + row.amountState.val, 0)
                        )
                    ),
                    div(
                        { class: "trophy-gallery-rows" },
                        ...resolved.rows.map((row) =>
                            NametagRow({
                                row,
                            })
                        )
                    )
                )
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "NAMETAGS"),
                p(
                    { class: "feature-header__desc" },
                    "Set delivered nametag amounts from Spelunk[17]. Each index maps directly to EquipmentNametagX."
                )
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "btn-secondary", onclick: () => load(true, true) }, "REFRESH")
            )
        ),
        renderBody
    );
};
