import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const GOD_PROGRESS_PATH = "Divinity[25]";
const GOD_LEVEL_START = 28;
const GOD_LEVEL_COUNT = 10;

const GodLevelRow = ({ entry, levelState }) =>
    SimpleNumberRow({
        entry,
        valueState: levelState,
    });

const GodProgressRow = ({ valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextValue) => writeVerified(GOD_PROGRESS_PATH, nextValue),
        renderInfo: () =>
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, "God Unlock Count / Rank"),
                span({ class: "account-row__sub-label" }, "0-10 unlocks gods. Values above 10 are the God Rank level.")
            ),
        renderBadge: (currentValue) =>
            toInt(currentValue, { min: 0 }) <= 10 ? `${currentValue ?? 0} UNLOCKED` : `RANK ${currentValue}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildGodEntries = (rawLevels, rawGodsInfo) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawGodsInfo ?? [])
        .slice(0, GOD_LEVEL_COUNT)
        .map((rawGod, index) => {
            const god = toIndexedArray(rawGod ?? []);
            const pathIndex = GOD_LEVEL_START + index;
            return {
                index: index + 1,
                pathIndex,
                path: `Divinity[${pathIndex}]`,
                rawName: String(god[0] ?? `God_${index}`).trim(),
                name: cleanName(god[0], `God ${index + 1}`),
                level: toInt(levels[pathIndex], { min: 0 }),
                badge: (currentValue) => `LV ${currentValue ?? 0}`,
            };
        });
};

export const GodTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Divinity Gods" });
    const entries = van.state([]);
    const progressState = van.state(0);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawDivinity, rawGodsInfo] = await Promise.all([gga("Divinity"), readCList("GodsInfo")]);
            progressState.val = toInt(rawDivinity?.[25], { min: 0 });
            entries.val = buildGodEntries(rawDivinity, rawGodsInfo);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    GodLevelRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = entry.level;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "GOD PROGRESS",
            note: "Divinity[25]",
            body: div({ class: "account-item-stack" }, GodProgressRow({ valueState: progressState })),
        }),
        AccountSection({
            title: "GOD LEVELS",
            note: () => `${entries.val.length} GODS FROM Divinity[28-37]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "GOD",
        description: "Edit Divinity god unlock/rank value and god levels. God names come from GodsInfo.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING DIVINITY GODS",
        errorTitle: "DIVINITY GODS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
