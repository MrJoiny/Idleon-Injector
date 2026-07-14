import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { InlineEditableNumberField } from "../../components/InlineEditableNumberField.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toNum,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const makeHoleEntry = ({
    key,
    index,
    name,
    path,
    value,
    badge = null,
    min = 0,
    max = Infinity,
    float = false,
    formatted = true,
}) => ({ key, index, name, path, value, badge, min, max, float, formatted });
const marbleNumberProps = {
    normalize: (raw) => resolveNumberInput(raw, { formatted: true, min: 0, fallback: null }),
    adjust: (raw, delta, current) => adjustFormattedIntInput(raw, delta, current ?? 0, { min: 0 }),
};

const FOUNTAIN_CURRENCIES = [
    "Bronze",
    "Silver",
    "Gold",
    "Dollar",
    "Credit",
    "Treasury",
    "Moolah",
    "Shilling",
    "Greane",
];
const WATER_SECTIONS = ["Blue Water", "Yellow Water", "Green Water"];
const RUBBER_DUCKIES_OPTION = 601;

const buildFountainUpgradeEntries = (data, waterIndex) => {
    const levelGroups = toIndexedArray(toIndexedArray(data.holes)[31]);
    const marbilizedGroups = toIndexedArray(toIndexedArray(data.holes)[32]);
    const levels = toIndexedArray(levelGroups[waterIndex] ?? []);
    const marbilized = toIndexedArray(marbilizedGroups[waterIndex] ?? []);
    const names = toIndexedArray(toIndexedArray(data.upgrades ?? [])[waterIndex] ?? []);
    const count = Math.max(levels.length, marbilized.length, names.length);

    return Array.from({ length: count }, (_, index) => {
        const definition = toIndexedArray(names[index] ?? []);
        const name = cleanName(definition[0], `${WATER_SECTIONS[waterIndex]} Upgrade ${index + 1}`);

        return {
            key: `fountain-${waterIndex}-${index}`,
            index: `${waterIndex}-${index}`,
            name,
            fields: {
                level: {
                    key: `fountain-${waterIndex}-${index}-level`,
                    path: `Holes[31][${waterIndex}][${index}]`,
                    value: toNum(levels[index], 0),
                },
                marble: {
                    key: `fountain-${waterIndex}-${index}-marble`,
                    path: `Holes[32][${waterIndex}][${index}]`,
                    value: toNum(marbilized[index], 0),
                },
            },
        };
    });
};

const FountainUpgradeRow = ({ entry, valueStates }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => `LV ${getOrCreateState(valueStates, entry.fields.level.key).val ?? 0}`,
        controlsClass: "account-row__controls--stack",
        controls: [
            InlineEditableNumberField({
                label: "Level",
                valueState: getOrCreateState(valueStates, entry.fields.level.key),
                path: entry.fields.level.path,
                rootClass: "account-stacked-field",
                labelClass: "account-stacked-field__label",
            }),
            InlineEditableNumberField({
                label: "Marble",
                valueState: getOrCreateState(valueStates, entry.fields.marble.key),
                path: entry.fields.marble.path,
                rootClass: "account-stacked-field",
                labelClass: "account-stacked-field__label",
                ...marbleNumberProps,
            }),
        ],
    });

const FountainNumberRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const FountainTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Fountain" });
    const currencyEntries = van.state([]);
    const generalEntries = van.state([]);
    const fillBarEntries = van.state([]);
    const luckyCoinEntries = van.state([]);
    const upgradeSections = WATER_SECTIONS.map((title, waterIndex) => ({
        title,
        waterIndex,
        entries: van.state([]),
        node: div({ class: "account-item-stack" }),
    }));
    const valueStates = new Map();
    const currencyNode = div({ class: "account-item-stack" });
    const generalNode = div({ class: "account-item-stack" });
    const fillBarNode = div({ class: "account-item-stack" });
    const luckyCoinNode = div({ class: "account-item-stack" });
    const reconcileCurrencyRows = createStaticRowReconciler(currencyNode);
    const reconcileGeneralRows = createStaticRowReconciler(generalNode);
    const reconcileFillBarRows = createStaticRowReconciler(fillBarNode);
    const reconcileLuckyCoinRows = createStaticRowReconciler(luckyCoinNode);
    const upgradeReconcilers = upgradeSections.map((section) => createStaticRowReconciler(section.node));

    const reconcileSimpleRows = (nodeReconciler, entries) => {
        nodeReconciler(entries.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
            entries.map((entry) => FountainNumberRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
        );
    };

    const syncEntryState = (entry) => {
        getOrCreateState(valueStates, entry.key).val = entry.value;
    };

    const load = async () =>
        run(async () => {
            const [holes, options, upgrades] = await Promise.all([
                gga("Holes"),
                gga("OptionsListAccount"),
                readCList("HoleFountUPG"),
            ]);
            const data = { holes, upgrades };
            const holeData = toIndexedArray(holes);
            const holeDetails = toIndexedArray(holeData[11]);
            const luckyCoins = toIndexedArray(holeData[30]);
            const fillBars = toIndexedArray(holeData[33]);

            currencyEntries.val = FOUNTAIN_CURRENCIES.map((name, index) =>
                makeHoleEntry({
                    key: `fountain-currency-${index}`,
                    index: 30 + index,
                    name,
                    path: `Holes[9][${30 + index}]`,
                    value: toNum(toIndexedArray(toIndexedArray(holes)[9])[30 + index], 0),
                })
            );
            generalEntries.val = [
                makeHoleEntry({
                    key: "fountain-selected-water",
                    index: 80,
                    name: "Selected Water",
                    path: "Holes[11][80]",
                    value: toNum(holeDetails[80], 0),
                    badge: (currentValue) => WATER_SECTIONS[currentValue] ?? `Water ${currentValue}`,
                    max: WATER_SECTIONS.length - 1,
                    formatted: false,
                }),
                makeHoleEntry({
                    key: "fountain-marble",
                    index: 81,
                    name: "Marble Amount",
                    path: "Holes[11][81]",
                    value: toNum(holeDetails[81], 0),
                }),
                makeHoleEntry({
                    key: "fountain-lanterns",
                    index: 84,
                    name: "Lanterns Used",
                    path: "Holes[11][84]",
                    value: toNum(holeDetails[84], 0),
                    max: 12,
                }),
                makeHoleEntry({
                    key: "fountain-rubber-duckies",
                    index: RUBBER_DUCKIES_OPTION,
                    name: "Rubber Duckies",
                    path: `OptionsListAccount[${RUBBER_DUCKIES_OPTION}]`,
                    value: toNum(toIndexedArray(options)[RUBBER_DUCKIES_OPTION], 0),
                }),
            ];
            fillBarEntries.val = WATER_SECTIONS.map((name, index) =>
                makeHoleEntry({
                    key: `fountain-fill-bar-${index}`,
                    index,
                    name: `${name} Fill Bar`,
                    path: `Holes[33][${index}]`,
                    value: toNum(fillBars[index], 0),
                    float: true,
                    formatted: false,
                })
            );
            luckyCoinEntries.val = FOUNTAIN_CURRENCIES.map((name, index) =>
                makeHoleEntry({
                    key: `fountain-lucky-coin-${index}`,
                    index,
                    name,
                    path: `Holes[30][${index}]`,
                    value: toNum(luckyCoins[index], -1),
                    badge: (currentValue) => (Number(currentValue) === -1 ? "LOCKED" : String(currentValue ?? 0)),
                    min: -1,
                    formatted: false,
                })
            );

            for (const entry of [
                ...currencyEntries.val,
                ...generalEntries.val,
                ...fillBarEntries.val,
                ...luckyCoinEntries.val,
            ])
                syncEntryState(entry);
            reconcileSimpleRows(reconcileCurrencyRows, currencyEntries.val);
            reconcileSimpleRows(reconcileGeneralRows, generalEntries.val);
            reconcileSimpleRows(reconcileFillBarRows, fillBarEntries.val);
            reconcileSimpleRows(reconcileLuckyCoinRows, luckyCoinEntries.val);

            upgradeSections.forEach((section, sectionIndex) => {
                section.entries.val = buildFountainUpgradeEntries(data, section.waterIndex);
                upgradeReconcilers[sectionIndex](
                    section.entries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"),
                    () => section.entries.val.map((entry) => FountainUpgradeRow({ entry, valueStates }))
                );
                for (const entry of section.entries.val) {
                    for (const field of Object.values(entry.fields)) {
                        getOrCreateState(valueStates, field.key).val = field.value;
                    }
                }
            });
        });

    load();

    return PersistentAccountListPage({
        title: "FOUNTAIN",
        description:
            "Edit Fountain currency, water progress, Lucky Coins, Rubber Duckies, and upgrades from Holes and OptionsListAccount.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING HOLE FOUNTAIN",
        errorTitle: "HOLE FOUNTAIN READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "CURRENCY",
                note: () => `${currencyEntries.val.length} CURRENCIES`,
                body: currencyNode,
            }),
            AccountSection({
                title: "GENERAL",
                note: () => `${generalEntries.val.length} ROWS`,
                body: generalNode,
            }),
            AccountSection({
                title: "FILL BARS",
                note: () => `${fillBarEntries.val.length} WATERS`,
                body: fillBarNode,
            }),
            AccountSection({
                title: "LUCKY COINS",
                note: () => `${luckyCoinEntries.val.length} CURRENCIES`,
                body: luckyCoinNode,
            }),
            ...upgradeSections.map((section) =>
                AccountSection({
                    title: section.title.toUpperCase(),
                    note: () => `${section.entries.val.length} UPGRADES`,
                    body: section.node,
                })
            )
        ),
    });
};
