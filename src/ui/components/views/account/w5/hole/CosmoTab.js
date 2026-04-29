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

const COSMO_SECTIONS = [
    { key: "hole", title: "HOLE MAJIK", holeIndex: 4 },
    { key: "village", title: "VILLAGE MAJIK", holeIndex: 5 },
    { key: "idleon", title: "IDLEON MAJIK", holeIndex: 6 },
];

const CosmoRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { formatted: true, min: 0, fallback: null }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

const buildCosmoEntries = (holes, upgrades, section, sectionIndex) => {
    const values = toIndexedArray(toIndexedArray(holes)[section.holeIndex]);
    const definitions = toIndexedArray(toIndexedArray(upgrades ?? [])[sectionIndex] ?? []);
    const count = Math.max(values.length, definitions.length);
    return Array.from({ length: count }, (_, index) => {
        const definition = toIndexedArray(definitions[index] ?? []);
        return {
            key: `${section.key}-${index}`,
            index,
            name: cleanName(definition[2], `${section.title} ${index + 1}`),
            path: `Holes[${section.holeIndex}][${index}]`,
            value: toNum(values[index], 0),
        };
    });
};

export const CosmoTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Cosmo" });
    const valueStates = new Map();
    const sectionEntries = new Map(COSMO_SECTIONS.map((section) => [section.key, van.state([])]));
    const sectionNodes = new Map(COSMO_SECTIONS.map((section) => [section.key, div({ class: "account-item-stack" })]));
    const reconcilers = new Map(
        COSMO_SECTIONS.map((section) => [section.key, createStaticRowReconciler(sectionNodes.get(section.key))])
    );

    const load = async () =>
        run(async () => {
            const [holes, upgrades] = await Promise.all([gga("Holes"), readCList("CosmoUpgrades")]);
            COSMO_SECTIONS.forEach((section, sectionIndex) => {
                const entries = buildCosmoEntries(holes, upgrades, section, sectionIndex);
                sectionEntries.get(section.key).val = entries;
                reconcilers.get(section.key)(entries.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
                    entries.map((entry) => CosmoRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
                );
                for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
            });
        });

    load();

    return PersistentAccountListPage({
        title: "COSMO",
        description: "Edit Conjuror Majik upgrades from Holes[4], Holes[5], and Holes[6].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE COSMO",
        errorTitle: "HOLE COSMO READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            ...COSMO_SECTIONS.map((section) =>
                AccountSection({
                    title: section.title,
                    note: () => `${sectionEntries.get(section.key).val.length} ROWS`,
                    body: sectionNodes.get(section.key),
                })
            )
        ),
    });
};
