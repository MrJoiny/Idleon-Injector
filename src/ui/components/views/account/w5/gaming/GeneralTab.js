import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { ActionButton } from "../../components/ActionButton.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const GOLD_NUGGETS_DUG_OPTION = 192;
const GENERAL_FIELDS = [
    { key: "bits", path: "Gaming[0]", name: "Gaming Bits", index: 0, formatted: true, float: true },
    { key: "dna", path: "Gaming[5]", name: "Gaming DNA", index: 5, formatted: true, float: true },
    { key: "highestNugget", path: "Gaming[8]", name: "Highest Gold Nugget", index: 8, formatted: true, float: true },
    {
        key: "nuggetsDug",
        path: `OptionsListAccount[${GOLD_NUGGETS_DUG_OPTION}]`,
        name: "Gold Nuggets Dug",
        optionIndex: GOLD_NUGGETS_DUG_OPTION,
        formatted: true,
    },
    { key: "acorns", path: "Gaming[9]", name: "Acorns", index: 9, formatted: true, float: true },
    { key: "snailMail", path: "Gaming[13]", name: "Snail Mail", index: 13, formatted: true, float: true },
    { key: "ratCrowns", path: "Gaming[14]", name: "Rat Crowns", index: 14, formatted: true, float: true },
];
const UPGRADE_FIELDS = [
    { key: "upgrade1", path: "Gaming[1]", index: 1, upgradeIndex: 0 },
    { key: "upgrade2", path: "Gaming[2]", index: 2, upgradeIndex: 1 },
    { key: "upgrade3", path: "Gaming[3]", index: 3, upgradeIndex: 2 },
];
const MUTATION_FIELDS = [
    { key: "mutations", path: "Gaming[4]", name: "Unlocked Mutations", index: 4, max: 8 },
    { key: "evolve", path: "Gaming[7]", name: "Evolve Upgrade", index: 7 },
];

const GamingNumberRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                formatted: entry.formatted,
                float: entry.float,
                min: 0,
                max: entry.max ?? Infinity,
                fallback: null,
            }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        renderBadge: (currentValue) =>
            entry.formatted ? largeFormatter(currentValue ?? 0) : `LV ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputMode: entry.float ? "float" : "int",
        inputProps: entry.formatted
            ? {
                  formatter: largeFormatter,
                  parser: largeParser,
              }
            : {},
        adjustInput: entry.formatted
            ? (rawValue, delta, currentValue) =>
                  adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0, max: entry.max ?? Infinity })
            : undefined,
    });

const LogBookRow = ({ valueState }) => {
    const { status, run } = useWriteStatus();

    const apply = async (nextValue) =>
        run(async () => {
            const verified = await writeVerified("Gaming[11]", nextValue);
            valueState.val = verified;
        });

    return AccountRow({
        info: div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, "Log Book Plants")),
        badge: () => `${String(valueState.val ?? "").length} LETTERS`,
        controlsClass: "account-row__controls--xl",
        status,
        controls: [
            span({ class: "gaming-raw-value" }, () => String(valueState.val ?? "")),
            ActionButton({
                label: "MAX",
                status,
                variant: "max-reset",
                onClick: (e) => {
                    e.preventDefault();
                    void apply("jjjjjjjjjj");
                },
            }),
            ActionButton({
                label: "ZERO",
                status,
                variant: "max-reset",
                onClick: (e) => {
                    e.preventDefault();
                    void apply("");
                },
            }),
        ],
    });
};

const buildGeneralEntries = (rawGaming, rawOptions) =>
    GENERAL_FIELDS.map((field) => ({
        ...field,
        label: field.optionIndex ? `#${field.optionIndex}` : field.path,
        value: field.optionIndex
            ? resolveNumberInput(rawOptions[String(field.optionIndex)] ?? 0, {
                  formatted: field.formatted,
                  float: field.float,
                  min: 0,
                  fallback: 0,
              })
            : resolveNumberInput(rawGaming?.[field.index] ?? 0, {
                  formatted: field.formatted,
                  float: field.float,
                  min: 0,
                  fallback: 0,
              }),
    }));

const buildUpgradeEntries = (rawGaming, rawUpgradeNames, fields = UPGRADE_FIELDS) =>
    fields.map((field) => {
        const definition = toIndexedArray(rawUpgradeNames?.[field.upgradeIndex] ?? []);
        const rawName = field.name ?? definition[0];
        return {
            ...field,
            label: field.path,
            name: cleanName(rawName, `Gaming Upgrade ${field.index}`),
            value: resolveNumberInput(rawGaming?.[field.index] ?? 0, {
                min: 0,
                max: field.max ?? Infinity,
                fallback: 0,
            }),
        };
    });

export const GeneralTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming General" });
    const generalEntries = van.state([]);
    const upgradeEntries = van.state([]);
    const mutationEntries = van.state([]);
    const logBookState = van.state("");
    const valueStates = new Map();
    const generalListNode = div({ class: "account-item-stack" });
    const upgradeListNode = div({ class: "account-item-stack" });
    const mutationListNode = div({ class: "account-item-stack" });
    const reconcileGeneralRows = createStaticRowReconciler(generalListNode);
    const reconcileUpgradeRows = createStaticRowReconciler(upgradeListNode);
    const reconcileMutationRows = createStaticRowReconciler(mutationListNode);

    const reconcileRows = () => {
        reconcileGeneralRows(generalEntries.val.map((entry) => entry.key).join("|"), () =>
            generalEntries.val.map((entry) =>
                GamingNumberRow({
                    entry,
                    valueState: getOrCreateState(valueStates, entry.key),
                })
            )
        );
        reconcileUpgradeRows(upgradeEntries.val.map((entry) => entry.key).join("|"), () =>
            upgradeEntries.val.map((entry) =>
                GamingNumberRow({
                    entry,
                    valueState: getOrCreateState(valueStates, entry.key),
                })
            )
        );
        reconcileMutationRows(mutationEntries.val.map((entry) => entry.key).join("|"), () =>
            mutationEntries.val.map((entry) =>
                GamingNumberRow({
                    entry,
                    valueState: getOrCreateState(valueStates, entry.key),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawGaming, rawUpgradeNames, rawOptions] = await Promise.all([
                gga("Gaming"),
                readCList("GamingUpgrades"),
                readGgaEntries("OptionsListAccount", [String(GOLD_NUGGETS_DUG_OPTION)]),
            ]);
            generalEntries.val = buildGeneralEntries(rawGaming, rawOptions);
            upgradeEntries.val = buildUpgradeEntries(rawGaming, toIndexedArray(rawUpgradeNames ?? []));
            mutationEntries.val = buildUpgradeEntries(rawGaming, [], MUTATION_FIELDS);
            logBookState.val = String(rawGaming?.[11] ?? "");
            reconcileRows();

            for (const entry of [...generalEntries.val, ...upgradeEntries.val, ...mutationEntries.val]) {
                getOrCreateState(valueStates, entry.key).val = entry.value;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "GENERAL",
            note: "Gaming state and nugget stats",
            body: generalListNode,
        }),
        AccountSection({
            title: "UPGRADES",
            note: "Gaming[1-3]",
            body: upgradeListNode,
        }),
        AccountSection({
            title: "MUTATION",
            note: "Gaming[4] and Gaming[7]",
            body: mutationListNode,
        }),
        AccountSection({
            title: "LOG BOOK",
            note: "Gaming[11]",
            body: div({ class: "account-item-stack" }, LogBookRow({ valueState: logBookState })),
        })
    );

    return PersistentAccountListPage({
        title: "GENERAL",
        description: "Edit Gaming currencies, upgrades, mutations, nugget stats, and related counters.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING GAMING GENERAL",
        errorTitle: "GAMING GENERAL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
