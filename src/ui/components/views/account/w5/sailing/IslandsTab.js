import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    writeVerified,
} from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountToggleRow } from "../../components/AccountToggleRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const ISLAND_UNLOCKS_PATH = "Sailing[0]";
const ISLAND_NAMES = [
    "Safari Island",
    "Beachy Coast",
    "Isolated Woods",
    "Rocky Peaks",
    "Stormy North",
    "Snowy South",
    "Toxic Bay Inc",
    "Candied Island",
    "Fungi Meadows",
    "Cloudy Quay",
    "Dungeon Cove",
    "Crystal Enclave",
    "Petulent Garage",
    "Isle Of Note",
    "The Edge",
    "Worlds End",
    "The Maw",
];

const IslandRow = ({ entry, unlockedState }) => {
    const writeToggle = async (enabled) => {
        const nextValue = enabled ? -1 : 0;
        await writeVerified(`${ISLAND_UNLOCKS_PATH}[${entry.index}]`, nextValue);
        unlockedState.val = nextValue;
    };

    return AccountToggleRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => (unlockedState.val === -1 ? "UNLOCKED" : "LOCKED"),
        checked: () => unlockedState.val === -1,
        title: "Toggle island unlock",
        write: writeToggle,
    });
};

const buildIslandEntries = (rawUnlocks, rawIslandInfo) =>
    toIndexedArray(rawIslandInfo ?? []).map((rawIsland, index) => {
        const island = toIndexedArray(rawIsland ?? []);
        return {
            index,
            rawName: ISLAND_NAMES[index] ?? String(island[0] ?? `Island_${index}`).trim(),
            name: ISLAND_NAMES[index] ?? cleanName(island[0], `Island ${index + 1}`),
            unlocked: Number(rawUnlocks?.[index] ?? 0) === -1 ? -1 : 0,
        };
    });

export const IslandsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sailing Islands" });
    const entries = van.state([]);
    const unlockedStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawUnlocks, rawIslandInfo] = await Promise.all([gga(ISLAND_UNLOCKS_PATH), readCList("IslandInfo")]);
            entries.val = buildIslandEntries(rawUnlocks, rawIslandInfo);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    IslandRow({
                        entry,
                        unlockedState: getOrCreateState(unlockedStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(unlockedStates, entry.index).val = entry.unlocked;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SAILING ISLANDS",
            note: () =>
                `${entries.val.filter((entry) => getOrCreateState(unlockedStates, entry.index).val === -1).length} / ${
                    entries.val.length
                } UNLOCKED`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "ISLANDS",
        description: "Toggle Sailing island unlocks. Unlock flags are stored as -1 for unlocked and 0 for locked.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SAILING ISLANDS",
        errorTitle: "SAILING ISLANDS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
