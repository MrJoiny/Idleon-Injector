import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { createStaticRowReconciler, getOrCreateState } from "../../accountShared.js";

const { div } = van.tags;

const SPICE_AMOUNTS_PATH = "Meals[3]";
const SPICE_NAMES = [
    "Grasslands Spice",
    "Jungle Spice",
    "Encroaching Forest Spice",
    "Tree Interior Spice",
    "Stinky Sewers Spice",
    "Desert Oasis Spice",
    "Beach Docks Spice",
    "Coarse Mountains Spice",
    "Twilight Desert Spice",
    "The Crypt Spice",
    "Frosty Peaks Spice",
    "Tundra Outback Spice",
    "Crystal Caverns Spice",
    "Pristalle Lake Spice",
    "Nebulon Mantle Spice",
    "Starfield Skies Spice",
    "Shores of Eternity Spice",
    "Molten Bay Spice",
    "Smokey Lake Spice",
    "Wurm Catacombs Spice",
    "Spirit Fields Spice",
    "Bamboo Forest Spice",
    "Lullaby Airways Spice",
    "Dharma Mesa Spice",
    "Shallow Shoals Spice",
    "Murky Trenches Spice",
];

const buildSpiceEntries = (rawSpiceAmounts) => {
    const spiceAmounts = toIndexedArray(rawSpiceAmounts ?? []);
    return SPICE_NAMES.map((name, index) => ({
        index,
        key: `spice:${index}`,
        name,
        path: `${SPICE_AMOUNTS_PATH}[${index}]`,
        value: spiceAmounts[index] ?? 0,
        float: true,
    }));
};

export const SpicesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Cooking spices" });
    const spiceEntries = van.state([]);
    const spiceAmountStates = new Map();
    const spiceRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileSpiceRows = createStaticRowReconciler(spiceRows);

    const reconcileRows = () =>
        reconcileSpiceRows(
            spiceEntries.val.map((entry) => entry.key).join("|"),
            () =>
                spiceEntries.val.map((entry) =>
                    SimpleNumberRow({
                        entry,
                        valueState: getOrCreateState(spiceAmountStates, entry.index),
                    })
                )
        );

    const load = async () =>
        run(async () => {
            spiceEntries.val = buildSpiceEntries(await gga(SPICE_AMOUNTS_PATH));
            reconcileRows();

            for (const entry of spiceEntries.val) {
                getOrCreateState(spiceAmountStates, entry.index).val = entry.value;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SPICES",
            note: () => `${spiceEntries.val.length} SPICES FROM ${SPICE_AMOUNTS_PATH}`,
            body: spiceRows,
        })
    );

    return PersistentAccountListPage({
        title: "COOKING SPICES",
        description: "Edit W4 Cooking spice amounts.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING COOKING SPICES",
        errorTitle: "COOKING SPICE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
