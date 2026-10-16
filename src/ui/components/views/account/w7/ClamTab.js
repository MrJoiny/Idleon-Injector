import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import { ClickerRow } from "../ClickerRow.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, writeVerified } from "../accountShared.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const PEARL_FIELD = { index: 454, label: "Pearls", live: true, formatted: true, float: true };
const CLAMWORKS_FIELDS = [
    { index: 455, label: "Pearl Value" },
    { index: 456, label: "Clam Comrades" },
    { index: 457, label: "Lucky Day" },
    { index: 458, label: "Multi-Scalping" },
    { index: 459, label: "Frugality" },
    { index: 460, label: "Pure Pearls" },
    { index: 461, label: "Encystation Up" },
    { index: 462, label: "Shinier Pearls" },
    { index: 463, label: "Anti Inflation" },
    { index: 464, label: "Worker Class" },
];
const ALL_FIELDS = [PEARL_FIELD, ...CLAMWORKS_FIELDS];
const SCURGE_FIELDS = [
    { name: "Scurge EXP", path: "Menagerie[0][7]", coreIndex: 7, float: true },
    { name: "Scurge level", path: "Menagerie[0][8]", coreIndex: 8 },
    ...[
        "Reckoning",
        "Pearl Infection",
        "Self Affliction",
        "Cost Dissolving",
        "Even Better",
        "Cross Culting",
        "Gravestart",
        "Swarming",
        "True Scurge",
    ].map((name, index) => ({ name, path: `Menagerie[5][${index}]`, index })),
];

const ClamRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        emptyBadge: "-",
    });

export const ClamTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Clam" });
    const fieldStates = new Map(ALL_FIELDS.map((field) => [field.index, van.state(undefined)]));
    const scurgeStates = new Map();
    const scurgeReady = van.state(false);
    const saving = van.state(false);
    const disabled = () => loading.val || saving.val;
    const scurgeList = div({ class: "account-item-stack" });
    const reconcileScurge = createStaticRowReconciler(scurgeList);

    const load = async () =>
        run(async () => {
            const [results, rawCore, rawLevels, rawDescriptions] = await Promise.all([
                readGgaEntries(
                    "OptionsListAccount",
                    ALL_FIELDS.map((field) => String(field.index))
                ),
                gga("Menagerie[0]"),
                gga("Menagerie[5]"),
                readCList("Spelunky[27]"),
            ]);
            const core = toIndexedArray(rawCore);
            const levels = toIndexedArray(rawLevels);
            const descriptions = toIndexedArray(rawDescriptions);
            for (const field of ALL_FIELDS) {
                fieldStates.get(field.index).val = results[String(field.index)] ?? 0;
            }
            scurgeReady.val = core.length >= 9 && levels.length >= 9;
            if (!scurgeReady.val) {
                reconcileScurge("uninitialized", () => []);
                return;
            }
            for (const field of SCURGE_FIELDS) {
                getOrCreateState(scurgeStates, field.path).val = Number(
                    field.index === undefined ? core[field.coreIndex] : levels[field.index]
                );
            }
            reconcileScurge(JSON.stringify(descriptions.slice(9, 18)), () =>
                SCURGE_FIELDS.map((field) =>
                    EditableNumberRow({
                        valueState: getOrCreateState(scurgeStates, field.path),
                        normalize: (raw) => {
                            const value = parseNumber(raw);
                            return Number.isFinite(value) && value >= 0 && (field.float || Number.isSafeInteger(value))
                                ? value
                                : null;
                        },
                        write: async (next) => {
                            if (disabled()) throw new Error("Another Clam operation is in progress.");
                            saving.val = true;
                            try {
                                return await writeVerified(field.path, next);
                            } finally {
                                await load();
                                saving.val = false;
                            }
                        },
                        renderInfo: () =>
                            div(
                                { class: "account-row__name-group" },
                                span({ class: "account-row__name" }, field.name),
                                field.index === undefined
                                    ? null
                                    : span(
                                          { class: "account-row__sub-label" },
                                          cleanName(descriptions[9 + field.index])
                                              .replace(/@/g, " ")
                                              .replace(/[{}$]/g, "…")
                                      )
                            ),
                        renderBadge: formatNumber,
                        adjustInput: (raw, delta, current) => Math.max(0, (parseNumber(raw) ?? current) + delta),
                        disabled,
                        rowClass: "account-row--wide-controls",
                        controlsClass: "account-row__controls--xl",
                        inputMode: field.float ? "float" : "int",
                        inputProps: { "aria-label": field.name },
                    })
                )
            );
        });

    const onWrite = async (index, value) => gga(`OptionsListAccount[${index}]`, value);

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "PEARLS",
            note: "OptionsListAccount[454]",
            body: div(
                { class: "account-item-stack" },
                ClamRow({
                    field: PEARL_FIELD,
                    fieldState: fieldStates.get(PEARL_FIELD.index),
                    onWrite,
                })
            ),
        }),
        AccountSection({
            title: "CLAMWORKS",
            note: () => `${CLAMWORKS_FIELDS.length} UPGRADES`,
            body: div(
                { class: "account-item-stack" },
                ...CLAMWORKS_FIELDS.map((field) =>
                    ClamRow({
                        field,
                        fieldState: fieldStates.get(field.index),
                        onWrite,
                    })
                )
            ),
        }),
        AccountSection({
            title: "SCURGE",
            note: () =>
                scurgeReady.val
                    ? "Clamworks promotion resets Scurge EXP, level, and these upgrades."
                    : "Scurge data is not initialized.",
            body: scurgeList,
        })
    );

    load();

    return PersistentAccountListPage({
        title: "CLAM",
        description: "Set Pearls, Clamworks upgrades, and Scurge EXP, level, and upgrades.",
        actions: RefreshButton({
            onRefresh: load,
            disabled,
        }),
        state: { loading, error },
        loadingText: "READING CLAM",
        errorTitle: "CLAM READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
