import van from "../../../../../vendor/van-1.6.0.js";
import { readGgaEntries } from "../../../../../services/api.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton, WarningBanner } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { toInt } from "../../accountShared.js";

const { div } = van.tags;

const TERRITORY_UNLOCK_PATH = "OptionsListAccount[85]";

const TERRITORY_NAMES = [
    "Grasslands",
    "Jungle",
    "Encroaching Forest",
    "Tree Interior",
    "Stinky Sewers",
    "Desert Oasis",
    "Beach Docks",
    "Coarse Mountains",
    "Twilight Desert",
    "The Crypt",
    "Frosty Peaks",
    "Tundra Outback",
    "Crystal Caverns",
    "Pristalle Lake",
    "Nebulon Mantle",
    "Starfield Skies",
    "Shores of Eternity",
    "Molten Bay",
    "Smokey Lake",
    "Wurm Catacombs",
    "Spirit Fields",
    "Bamboo Forest",
    "Lullaby Airways",
    "Dharma Mesa",
    "Shallow Shoals",
    "Murky Trenches",
];

// Territory spice rows are temporarily hidden; keep this tab focused on unlocks only.
// const TERRITORY_SPICES_INDEX = 4;
// const buildTerritoryEntries = (rawTerritory) => {
//     const territory = toIndexedArray(rawTerritory ?? []);
//     return TERRITORY_NAMES.map((name, index) => {
//         const row = toIndexedArray(territory[index] ?? []);
//         return {
//             index,
//             key: `territory:${index}`,
//             name,
//             path: `Territory[${index}][${TERRITORY_SPICES_INDEX}]`,
//             value: resolveNumberInput(row[TERRITORY_SPICES_INDEX] ?? 0, {
//                 formatted: true,
//                 float: true,
//                 min: 0,
//                 fallback: 0,
//             }),
//             formatted: true,
//             float: true,
//             badge: (currentValue) => largeFormatter(currentValue ?? 0),
//         };
//     });
// };

export const TerritoryTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Breeding territory" });
    const territoryUnlockState = van.state(0);

    const load = async () =>
        run(async () => {
            const rawOptions = await readGgaEntries("OptionsListAccount", ["85"]);
            territoryUnlockState.val = toInt(rawOptions["85"], { min: 0 });
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "TERRITORY UNLOCK",
            note: "OptionsListAccount[85]",
            body: div(
                { class: "account-item-stack" },
                SimpleNumberRow({
                    entry: {
                        index: 85,
                        name: "Territories Unlocked",
                        path: TERRITORY_UNLOCK_PATH,
                        max: TERRITORY_NAMES.length,
                        formatted: false,
                        badge: (currentValue) => `${currentValue ?? 0} / ${TERRITORY_NAMES.length}`,
                    },
                    valueState: territoryUnlockState,
                })
            ),
        })
        // AccountSection({
        //     title: "TERRITORY",
        //     note: () => `${territoryEntries.val.length} TERRITORIES`,
        //     body: territoryRows,
        // })
    );

    return PersistentAccountListPage({
        title: "BREEDING TERRITORY",
        description: "Edit W4 Breeding territory unlocks and spice amounts.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        topNotices: WarningBanner("Changing territories unlocked may require a cloudsave before the game applies it."),
        state: { loading, error },
        loadingText: "READING BREEDING TERRITORY",
        errorTitle: "BREEDING TERRITORY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
