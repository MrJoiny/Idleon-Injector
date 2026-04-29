import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
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
    toNum,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const JAR_DESTROYED_FIELDS = [
    "Simple Jars Destroyed",
    "Tall Jars Destroyed",
    "Ornate Jars Destroyed",
    "Great Jars Destroyed",
    "Enchanted Jars Destroyed",
    "Artisan Jars Destroyed",
    "Epic Jars Destroyed",
    "Gilded Jars Destroyed",
    "Ceremony Jars Destroyed",
    "Heirloom Jars Destroyed",
];

const JarRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { formatted: true, min: 0, fallback: null }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => (entry.badge ? entry.badge(currentValue) : largeFormatter(currentValue ?? 0)),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

const buildCollectibleEntries = (holes, gems, start, count, sectionKey) => {
    const values = toIndexedArray(toIndexedArray(holes)[24]);
    const names = toIndexedArray(gems ?? []);

    return Array.from({ length: count }, (_, offset) => {
        const index = start + offset;
        return {
            key: `${sectionKey}-${index}`,
            index,
            name: cleanName(
                String(names[index] ?? `Collectible ${index + 1}`).split("|")[0],
                `Collectible ${index + 1}`
            ),
            path: `Holes[24][${index}]`,
            value: toNum(values[index], 0),
            badge: (currentValue) => (Number(currentValue ?? 0) > 0 ? `FOUND ${currentValue}` : "MISSING"),
        };
    });
};

export const JarTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Jars" });
    const sections = [
        { key: "jar-rupies", title: "RUPIES", entries: van.state([]), node: div({ class: "account-item-stack" }) },
        {
            key: "collectibles-set-1",
            title: "COLLECTIBLES SET 1",
            entries: van.state([]),
            node: div({ class: "account-item-stack" }),
        },
        {
            key: "collectibles-set-2",
            title: "COLLECTIBLES SET 2",
            entries: van.state([]),
            node: div({ class: "account-item-stack" }),
        },
        {
            key: "jar-destroyed",
            title: "JARS DESTROYED",
            entries: van.state([]),
            node: div({ class: "account-item-stack" }),
        },
    ];
    const valueStates = new Map();
    const reconcilers = new Map(sections.map((section) => [section.key, createStaticRowReconciler(section.node)]));

    const reconcileSection = (section) => {
        reconcilers.get(section.key)(section.entries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
            section.entries.val.map((entry) => JarRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
        );
        for (const entry of section.entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
    };

    const load = async () =>
        run(async () => {
            const [holes, gems] = await Promise.all([gga("Holes"), readCList("HolesInfo[67]")]);
            const amounts = toIndexedArray(toIndexedArray(holes)[9]);
            const stats = toIndexedArray(toIndexedArray(holes)[11]);

            sections[0].entries.val = [
                ...Array.from({ length: 10 }, (_, index) => ({
                    key: `jar-rupie-${index}`,
                    index: 20 + index,
                    name: `Rupie Slot ${index + 1}`,
                    path: `Holes[9][${20 + index}]`,
                    value: toNum(amounts[20 + index], 0),
                })),
                {
                    key: "jar-white-rupies",
                    index: 38,
                    name: "Total White Rupies",
                    path: "Holes[11][38]",
                    value: toNum(stats[38], 0),
                },
                {
                    key: "jar-black-rupies",
                    index: 39,
                    name: "Total Black Rupies",
                    path: "Holes[11][39]",
                    value: toNum(stats[39], 0),
                },
            ];
            sections[1].entries.val = buildCollectibleEntries(holes, gems, 0, 16, "collectible-set-1");
            sections[2].entries.val = buildCollectibleEntries(holes, gems, 16, 24, "collectible-set-2");
            sections[3].entries.val = JAR_DESTROYED_FIELDS.map((name, offset) => {
                const index = 40 + offset;
                return {
                    key: `jar-destroyed-${index}`,
                    index,
                    name,
                    path: `Holes[11][${index}]`,
                    value: toNum(stats[index], 0),
                };
            });

            for (const section of sections) reconcileSection(section);
        });

    load();

    return PersistentAccountListPage({
        title: "THE JARS",
        description: "Edit rupies, collectibles, and jar counters from Holes[9], Holes[24], and Holes[11].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE JARS",
        errorTitle: "HOLE JARS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            ...sections.map((section) =>
                AccountSection({
                    title: section.title,
                    note: () => `${section.entries.val.length} ROWS`,
                    body: section.node,
                })
            )
        ),
    });
};
