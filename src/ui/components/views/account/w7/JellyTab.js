import van from "../../../../vendor/van-1.6.0.js";
import { deleteGga, gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";
import { renderTabNav } from "../tabShared.js";

const { div, span } = van.tags;
const CELL_NAMES = ["Amoeba", "Plasmid", "Ribosome", "Organelle", "Immunoid", "Virus", "Mitochondria", "Gigacyst"];
const CELL_LEVEL_LIMIT = Math.floor(Math.log(Number.MAX_VALUE / 20) / Math.log(1.3)) - 1;
const PANES = [
    { id: "upgrades", label: "UPGRADES" },
    { id: "cells", label: "CELLS" },
];

const validLevel = (raw, max) => {
    const text = String(raw).trim();
    if (!/^\d+$/.test(text)) return null;
    const value = Number(text);
    return Number.isSafeInteger(value) && value <= max ? value : null;
};

const LevelRow = ({
    id,
    name,
    description,
    valueState,
    max,
    displayMax = false,
    write,
    locked = false,
    statusLabel = null,
    note = null,
}) => {
    const writeError = van.state("");
    return EditableNumberRow({
        valueState,
        normalize: (raw) => validLevel(raw, max),
        write: async (next) => {
            writeError.val = "";
            try {
                return await write(next);
            } catch (error) {
                writeError.val = error.message;
                throw error;
            }
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${id}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, name),
                description ? span({ class: "account-row__sub-label", title: description }, description) : null,
                note ? span({ class: "account-row__sub-label" }, note) : null,
                span({ class: "account-row__sub-label", role: "status" }, () => writeError.val)
            ),
        ],
        renderBadge: (value) => {
            const status = statusLabel ? statusLabel() : locked ? "LOCKED" : "";
            return `${status ? `${status} · ` : ""}LV ${value ?? 0}${displayMax ? ` / ${max}` : ""}`;
        },
        adjustInput: (raw, delta, current) =>
            Math.max(0, Math.min(max, (validLevel(raw, max) ?? current ?? 0) + delta)),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });
};

/** Jelly Operator account editor backed by current Research and JellyUPG definitions. */
export const JellyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Jelly Operator" });
    const activePane = van.state("upgrades");
    const bloodcells = van.state(0);
    const attempts = van.state(0);
    const obstruction = van.state(0);
    const purchasedSlots = van.state(0);
    const upgradeCount = van.state(0);
    const upgradeStates = new Map();
    const cellStates = new Map();
    const totalCellLevels = van.derive(() =>
        Array.from({ length: 9 }, (_, id) => Number(getOrCreateState(cellStates, id).val) || 0).reduce(
            (total, level) => total + level,
            0
        )
    );
    const upgradeList = div({ class: "account-item-stack" });
    const cellList = div({ class: "account-item-stack" });
    const reconcileUpgrades = createStaticRowReconciler(upgradeList);
    const reconcileCells = createStaticRowReconciler(cellList);

    const load = async () =>
        run(async () => {
            const [rawDefinitions, rawOrder, rawResearch, rawLevel] = await Promise.all([
                readCList("JellyUPG"),
                readCList("Research[44]"),
                gga("Research"),
                gga("Lv0[20]"),
            ]);
            const definitions = toIndexedArray(rawDefinitions);
            const order = toIndexedArray(rawOrder);
            const research = toIndexedArray(rawResearch);
            const stats = toIndexedArray(research[7]);
            const levels = toIndexedArray(research[17]);
            const cellLevels = toIndexedArray(research[16]);
            const slots = toIndexedArray(research[18]);
            const accountLevel = Number(rawLevel) || 0;

            bloodcells.val = Number(stats[11]) || 0;
            attempts.val = Number(stats[10]) || 0;
            obstruction.val = Number(stats[9]) || 0;
            purchasedSlots.val = slots.length;

            const entries = order
                .map((rawId, orderIndex) => {
                    const id = Number(rawId);
                    const definition = toIndexedArray(definitions[id]);
                    if (!Number.isInteger(id) || !definition.length || !String(definition[0] ?? "").trim()) return null;
                    const gameCap = Number(definition[1]);
                    const costMultiplier = Number(definition[2]);
                    const costBase =
                        Math.max(0.1, Number(definition[4]) || 1) *
                        (1 + orderIndex / 7) *
                        (6 + 5 * orderIndex + orderIndex ** 2) *
                        Math.pow(1.4 + Math.max(0, orderIndex - 3) / 30, Math.max(0, orderIndex - 4)) *
                        Math.pow(1.3, Math.max(0, orderIndex - 20));
                    const safeCap =
                        costMultiplier > 1
                            ? Math.max(
                                  0,
                                  Math.floor(
                                      (Math.log(Number.MAX_VALUE) - Math.log(costBase)) / Math.log(costMultiplier)
                                  ) - 2
                              )
                            : Number.MAX_SAFE_INTEGER;
                    return {
                        id,
                        orderIndex,
                        name: cleanName(definition[0], `Upgrade ${id}`),
                        description: cleanName(definition[5]),
                        max: gameCap <= 998 ? gameCap : safeCap,
                        displayMax: gameCap <= 998,
                        locked:
                            accountLevel <
                            15 + 2 * orderIndex + Math.floor(orderIndex / 15) - Math.floor(orderIndex / 11),
                    };
                })
                .filter(Boolean);
            upgradeCount.val = entries.length;
            reconcileUpgrades(
                entries.map((entry) => `${entry.id}:${entry.name}:${entry.max}:${entry.locked}`).join("|"),
                () =>
                    entries.map((entry) =>
                        LevelRow({
                            ...entry,
                            valueState: getOrCreateState(upgradeStates, entry.id),
                            write: async (next) => {
                                await writeVerified(`Research[17][${entry.id}]`, next);
                                if (entry.id === 8 || entry.id === 9) await deleteGga("DNSM.h.JellySlotz");
                                return next;
                            },
                        })
                    )
            );
            for (const entry of entries) getOrCreateState(upgradeStates, entry.id).val = Number(levels[entry.id]) || 0;

            reconcileCells(CELL_NAMES.join("|"), () =>
                CELL_NAMES.map((name, id) =>
                    LevelRow({
                        id,
                        name,
                        note: "Setting a level resets this cell's XP to 0.",
                        statusLabel: () =>
                            id <
                            CELL_NAMES.reduce(
                                (owned, _, upgradeId) => owned + getOrCreateState(upgradeStates, upgradeId).val,
                                0
                            )
                                ? "UNLOCKED"
                                : "LOCKED",
                        valueState: getOrCreateState(cellStates, id),
                        max: CELL_LEVEL_LIMIT,
                        write: async (next) => {
                            let writeError = null;
                            let cacheError = null;
                            try {
                                await writeManyVerified([
                                    { path: `Research[16][${id}]`, value: next },
                                    { path: `Research[15][${id}]`, value: 0 },
                                ]);
                            } catch (error) {
                                writeError = error;
                            }
                            try {
                                await deleteGga("DNSM.h.CellLV_tot");
                            } catch (error) {
                                cacheError = error;
                            }
                            if (writeError) {
                                throw new Error(
                                    `Cell level/XP update incomplete: ${writeError.message}${cacheError ? `; cache refresh also failed: ${cacheError.message}` : ""}. Refresh to inspect the saved values.`
                                );
                            }
                            if (cacheError)
                                throw new Error(
                                    `Cell level and XP were saved, but cache refresh failed: ${cacheError.message}`
                                );
                            return next;
                        },
                    })
                )
            );
            for (let id = 0; id < 9; id++) getOrCreateState(cellStates, id).val = Number(cellLevels[id]) || 0;
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "PROGRESS",
            body: div(
                {
                    class: "nametag-gallery-summary",
                    style: "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 16px;",
                },
                div(
                    span({ class: "nametag-gallery-summary__label" }, "Attempts left "),
                    span({ class: "nametag-gallery-summary__value" }, () => String(attempts.val))
                ),
                div(
                    span({ class: "nametag-gallery-summary__label" }, "Obstruction level "),
                    span({ class: "nametag-gallery-summary__value" }, () => String(obstruction.val))
                ),
                div(
                    span({ class: "nametag-gallery-summary__label" }, "Purchased slots "),
                    span({ class: "nametag-gallery-summary__value" }, () => String(purchasedSlots.val))
                ),
                div(
                    span({ class: "nametag-gallery-summary__label" }, "Cell levels "),
                    span({ class: "nametag-gallery-summary__value" }, () => String(totalCellLevels.val))
                )
            ),
        }),
        AccountSection({
            title: "BLOODCELLS",
            body: SimpleNumberRow({
                entry: { name: "Bloodcells", path: "Research[7][11]", formatted: true, float: true },
                valueState: bloodcells,
            }),
        }),
        renderTabNav({
            tabs: PANES,
            activeId: activePane,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        div(
            { class: () => (activePane.val === "upgrades" ? "" : "is-hidden-until-ready") },
            AccountSection({ title: "UPGRADES", note: () => `${upgradeCount.val} upgrades`, body: upgradeList })
        ),
        div(
            { class: () => (activePane.val === "cells" ? "" : "is-hidden-until-ready") },
            AccountSection({ title: "CELLS", note: "8 cells", body: cellList })
        )
    );
    return PersistentAccountListPage({
        title: "JELLY OPERATOR",
        description: "Inspect progress and set Bloodcells, upgrade levels, and cell levels.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING JELLY OPERATOR",
        errorTitle: "JELLY OPERATOR READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
