import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { createStaticRowReconciler, getOrCreateState } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const SAILING_CURRENCY_PATH = "Sailing[1]";
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

const getCurrencyName = (index) => {
    if (index === 0) return "Gold Bars";

    const islandIndex = Math.floor((index - 1) / 2);
    const treasureSlot = ((index - 1) % 2) + 1;
    const islandName = ISLAND_NAMES[islandIndex] ?? `Island ${islandIndex + 1}`;
    return `${islandName} Treasure ${treasureSlot}`;
};

const CurrencyRow = ({ entry, amountState }) =>
    SimpleNumberRow({
        entry,
        valueState: amountState,
    });

const buildCurrencyEntries = (rawCurrencies, rawIslandInfo) => {
    const currencies = toIndexedArray(rawCurrencies ?? []);
    const expectedLength = 1 + toIndexedArray(rawIslandInfo ?? []).length * 2;
    const count = Math.max(currencies.length, expectedLength);

    return Array.from({ length: count }, (_, index) => ({
        index,
        name: getCurrencyName(index),
        path: `${SAILING_CURRENCY_PATH}[${index}]`,
        amount: currencies[index] ?? 0,
        float: true,
    }));
};

export const CurrencyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sailing Currency" });
    const entries = van.state([]);
    const amountStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawCurrencies, rawIslandInfo] = await Promise.all([
                gga(SAILING_CURRENCY_PATH),
                readCList("IslandInfo"),
            ]);
            entries.val = buildCurrencyEntries(rawCurrencies, rawIslandInfo);
            reconcileRows(entries.val.map((entry) => `${entry.index}:${entry.name}`).join("|"), () =>
                entries.val.map((entry) =>
                    CurrencyRow({
                        entry,
                        amountState: getOrCreateState(amountStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(amountStates, entry.index).val = entry.amount;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SAILING CURRENCY",
            note: () => `${entries.val.length} VALUES FROM Sailing[1]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "CURRENCY",
        description: "Edit Sailing currencies from Sailing[1]. Treasure names are inferred from island order.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SAILING CURRENCY",
        errorTitle: "SAILING CURRENCY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
