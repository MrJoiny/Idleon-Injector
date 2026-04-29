import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../accountShared.js";

const { div } = van.tags;

const GLIMBO_LEVELS_PATH = "Research[12]";

const GlimboRow = ({ entry, levelState }) =>
    SimpleNumberRow({
        entry,
        valueState: levelState,
    });

export const GlimboTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Glimbo" });
    const entriesState = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const buildEntries = async (rawItemIds) => {
        const itemIds = toIndexedArray(rawItemIds ?? [])
            .map((entry) => String(entry ?? "").trim())
            .filter(Boolean);
        const itemDefs = itemIds.length
            ? await readGgaEntries("ItemDefinitionsGET.h", itemIds, ["displayName", "DisplayName", "Name", "name"])
            : {};

        return itemIds.map((itemId, index) => {
            const definition = itemDefs[itemId] ?? {};

            return {
                index,
                path: `${GLIMBO_LEVELS_PATH}[${index}]`,
                itemId,
                name: cleanName(
                    definition.displayName ?? definition.DisplayName ?? definition.Name ?? definition.name,
                    itemId
                ),
                subLabel: itemId,
                formatted: false,
                badge: (currentValue) => `LV ${toInt(currentValue, { min: 0 })}`,
            };
        });
    };

    const reconcileGlimboRows = () => {
        reconcileRows(entriesState.val.map((entry) => entry.itemId).join("|"), () =>
            entriesState.val.map((entry) =>
                GlimboRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            entriesState.val = await buildEntries(await readCList("Research[27]"));
            reconcileGlimboRows();

            const levels = toIndexedArray((await gga(GLIMBO_LEVELS_PATH)) ?? []);
            for (const entry of entriesState.val) {
                getOrCreateState(levelStates, entry.index).val = toInt(levels[entry.index], { min: 0 });
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "GLIMBO TRADE LEVELS",
            note: () => `${entriesState.val.length} ITEM TRADES`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "GLIMBO",
        description: "Set W7 Glimbo trade levels from Research[12]. Item names come from Research[27] item IDs.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING GLIMBO",
        errorTitle: "GLIMBO READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
