import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { formatNumber, parseNumber } from "../../../../../utils/numberFormat.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span, label, input } = van.tags;

export const OmniJadeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Omni Jade" });
    const saving = van.state(false);
    const states = new Map();
    const state = (path) => getOrCreateState(states, path);
    const disabled = () => loading.val || saving.val;
    const list = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(list);

    const load = async () =>
        run(async () => {
            const [rawToggles, rawLevels, rawDefinitions] = await Promise.all([
                gga("Menagerie[6]"),
                gga("Menagerie[7]"),
                readCList("NinjaUpg"),
            ]);
            const toggles = toIndexedArray(rawToggles);
            const levels = toIndexedArray(rawLevels);
            const definitions = toIndexedArray(rawDefinitions).slice(0, 17);
            if (toggles.length < 17 || levels.length < 17 || definitions.length < 17) {
                throw new Error("Omni Jade data is not initialized.");
            }
            for (let i = 0; i < 17; i++) {
                state(`Menagerie[6][${i}]`).val = Number(toggles[i]);
                state(`Menagerie[7][${i}]`).val = Number(levels[i]);
            }
            reconcileRows(JSON.stringify(definitions), () =>
                definitions.map((definition, i) => {
                    const rawName = toIndexedArray(definition)[4];
                    const name = /^Name\d*$/i.test(String(rawName))
                        ? `Node ${i + 1}`
                        : cleanName(rawName, `Node ${i + 1}`);
                    const path = `Menagerie[7][${i}]`;
                    return div(
                        { class: "account-item-stack" },
                        toggleRow(name, `Menagerie[6][${i}]`, `Node #${i}`),
                        EditableNumberRow({
                            valueState: state(path),
                            normalize: (raw) => {
                                const value = parseNumber(raw);
                                return Number.isSafeInteger(value) && value >= 0 ? value : null;
                            },
                            write: (next) => save(() => writeVerified(path, next)),
                            renderInfo: () => span({ class: "account-row__name" }, `${name} bonus levels`),
                            renderBadge: formatNumber,
                            adjustInput: (raw, delta, current) => Math.max(0, (parseNumber(raw) ?? current) + delta),
                            disabled,
                            rowClass: "account-row--wide-controls",
                            controlsClass: "account-row__controls--xl",
                            inputProps: { "aria-label": `${name} bonus levels` },
                        })
                    );
                })
            );
        });

    const save = async (task) => {
        if (disabled()) throw new Error("Another Omni Jade operation is in progress.");
        saving.val = true;
        try {
            return await task();
        } finally {
            await load();
            saving.val = false;
        }
    };

    const toggleRow = (name, path, note) => {
        const { status, run: write } = useWriteStatus();
        const message = van.state("");
        return div(
            { class: "account-row" },
            div(
                { class: "account-row__info" },
                div(
                    { class: "account-row__name-group" },
                    span({ class: "account-row__name" }, name),
                    span({ class: "account-row__sub-label" }, note),
                    span({ class: "account-write-feedback", role: "status" }, () => message.val)
                )
            ),
            span({ class: "account-row__badge" }, () => (state(path).val >= 1 ? "ON" : "OFF")),
            label(
                { class: "toggle-switch" },
                input({
                    type: "checkbox",
                    role: "switch",
                    "aria-label": name,
                    checked: () => state(path).val >= 1,
                    disabled: () => disabled() || status.val === "loading",
                    onchange: (event) => {
                        const next = event.target.checked ? 1 : 0;
                        event.target.checked = state(path).val >= 1;
                        message.val = "Saving…";
                        void write(() => save(() => writeVerified(path, next)), {
                            onSuccess: () => {
                                message.val = "Saved";
                            },
                            onError: (error) => {
                                message.val = error.message;
                            },
                        });
                    },
                }),
                span({ class: "slider" })
            )
        );
    };

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "OMNI JADE",
            note: "Disabling a node preserves its earned bonus levels.",
            body: list,
        })
    );
    load();
    return PersistentAccountListPage({
        title: "OMNI JADE",
        description: "Selected Sneaking upgrades gain +1 bonus level per day without raising their purchase cost.",
        actions: RefreshButton({ onRefresh: load, disabled }),
        state: { loading, error },
        loadingText: "READING OMNI JADE",
        errorTitle: "OMNI JADE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
