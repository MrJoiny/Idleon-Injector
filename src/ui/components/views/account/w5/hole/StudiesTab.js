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

const STUDY_SECTIONS = ["Shallow Caverns", "Glowshroom Tunnels", "Underground Overgrowth", "Not Named"];

const StudyRow = ({ entry, valueState }) =>
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

const buildStudyEntries = (holes, names, sectionIndex) => {
    const values = toIndexedArray(toIndexedArray(holes)[26]);
    const start = sectionIndex * 5;
    const end = Math.min(start + 5, names.length);
    return Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
        const index = start + offset;
        return {
            key: `study-${index}`,
            index,
            name: cleanName(names[index], `Study ${index + 1}`),
            path: `Holes[26][${index}]`,
            value: toNum(values[index], 0),
        };
    });
};

export const StudiesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Studies" });
    const valueStates = new Map();
    const sectionEntries = new Map(STUDY_SECTIONS.map((title, index) => [index, van.state([])]));
    const sectionNodes = new Map(STUDY_SECTIONS.map((title, index) => [index, div({ class: "account-item-stack" })]));
    const reconcilers = new Map(
        STUDY_SECTIONS.map((title, index) => [index, createStaticRowReconciler(sectionNodes.get(index))])
    );

    const load = async () =>
        run(async () => {
            const [holes, rawNames] = await Promise.all([gga("Holes"), readCList("HolesInfo[68]")]);
            const names = toIndexedArray(rawNames ?? []);
            STUDY_SECTIONS.forEach((_, sectionIndex) => {
                const entries = buildStudyEntries(holes, names, sectionIndex);
                sectionEntries.get(sectionIndex).val = entries;
                reconcilers.get(sectionIndex)(entries.map((entry) => entry.key).join("|"), () =>
                    entries.map((entry) => StudyRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
                );
                for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
            });
        });

    load();

    return PersistentAccountListPage({
        title: "STUDIES",
        description: "Edit Studies villager levels from Holes[26].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE STUDIES",
        errorTitle: "HOLE STUDIES READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            ...STUDY_SECTIONS.map((title, sectionIndex) =>
                AccountSection({
                    title: title.toUpperCase(),
                    note: () => `${sectionEntries.get(sectionIndex).val.length} ROWS`,
                    body: sectionNodes.get(sectionIndex),
                })
            )
        ),
    });
};
