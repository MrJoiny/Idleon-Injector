/**
 * Autobuy Tab
 * Town shop items the game buys into the chest with chest coins whenever they have stock.
 */

import van from "../../../vendor/van-1.6.0.js";
import { fetchConfig, readComputed, saveConfigFile, updateSessionConfig } from "../../../services/api.js";
import { formatNumber } from "../../../utils/numberFormat.js";
import { cleanName, createStaticRowReconciler, getOrCreateState } from "./accountShared.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { AccountSection } from "./components/AccountSection.js";
import { AccountToggleRow } from "./components/AccountToggleRow.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div, span } = van.tags;

const WORLD_TABS = [1, 2, 3, 4, 5, 6, 7].map((world) => ({ id: `w${world}`, label: `W${world}`, world }));

const WorldShops = ({ world, picks, syncPicks, setPick }) => {
    const { loading, error, run } = useAccountLoad({ label: `W${world} Autobuy` });
    const stockStates = new Map();
    const listNode = div({ class: "scrollable-panel content-stack" });
    const reconcileShops = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [shops, config] = await Promise.all([readComputed("autobuy", "shops"), fetchConfig()]);
            syncPicks(config.cheatConfig.autobuy.items);
            const worldShops = shops.filter((shop) => shop.world === world);

            reconcileShops(
                worldShops.map((shop) => `${shop.shop}:${shop.items.map(({ item }) => item)}`).join("|"),
                () =>
                    worldShops.map((shop) =>
                        AccountSection({
                            title: cleanName(shop.town).toUpperCase(),
                            body: div(
                                { class: "account-item-stack" },
                                shop.items.map(({ item, name }) => {
                                    const key = `${shop.shop}:${item}`;
                                    const stock = getOrCreateState(stockStates, key);
                                    return AccountToggleRow({
                                        info: div(
                                            { class: "account-row__name-group" },
                                            span({ class: "account-row__name" }, cleanName(name))
                                        ),
                                        badge: () => `LEFT ${formatNumber(stock.val)}`,
                                        checked: () => picks.val.has(key),
                                        title: "Toggle auto-buy",
                                        write: (on) => setPick(key, on),
                                    });
                                })
                            ),
                        })
                    )
            );

            for (const shop of worldShops) {
                for (const { item, stock } of shop.items)
                    getOrCreateState(stockStates, `${shop.shop}:${item}`).val = stock;
            }
        });

    load();

    return PersistentAccountListPage({
        title: `W${world} SHOPS`,
        description:
            "Switched-on items are bought into the storage chest with chest coins whenever the shop has stock.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: `READING W${world} SHOPS`,
        errorTitle: `W${world} SHOPS READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body: listNode,
    });
};

export const AutobuyTab = () => {
    const activeSubTab = van.state(WORLD_TABS[0].id);
    // Shared by every world so a save always carries the picks from all of them.
    const picks = van.state(new Set());
    let saving = Promise.resolve();
    let pendingSaves = 0;

    // A load that lands while a save is queued would undo the newest toggles, so keep the local picks then.
    const syncPicks = (items) => {
        if (!pendingSaves) picks.val = new Set(items);
    };

    const savePicks = async () => {
        const result = await updateSessionConfig({ cheatConfig: { autobuy: { items: [...picks.val] } } });
        if (result.message !== "Configuration updated successfully") {
            throw new Error(result.details || result.message || "Could not apply auto-buy in game");
        }
        // /api/config/save rewrites config.custom.js from whatever it is handed, so it needs the whole config.
        const config = await fetchConfig();
        await saveConfigFile({
            startupCheats: config.startupCheats,
            cheatConfig: config.cheatConfig,
            injectorConfig: config.injectorConfig,
        });
    };

    const setPick = async (key, on) => {
        const next = new Set(picks.val);
        if (on) next.add(key);
        else next.delete(key);
        picks.val = next;
        // Saves send the whole list, so run them one at a time; the last one carries every quick toggle.
        saving = saving.catch(() => {}).then(savePicks);
        pendingSaves++;
        try {
            await saving;
        } catch (error) {
            const reverted = new Set(picks.val);
            if (on) reverted.delete(key);
            else reverted.add(key);
            picks.val = reverted;
            throw error;
        } finally {
            pendingSaves--;
        }
    };

    return div(
        { class: "world-tab" },
        renderTabNav({
            tabs: WORLD_TABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: WORLD_TABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => WorldShops({ world: tab.world, picks, syncPicks, setPick }),
            })
        )
    );
};
