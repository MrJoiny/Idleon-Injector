/**
 * Autobuy Tab
 * Town shop items bought into the chest with chest coins, and clicker upgrades bought with their own currency.
 */

import van from "../../../vendor/van-1.6.0.js";
import { NumberInput } from "../../NumberInput.js";
import { fetchConfig, readComputed, saveConfigFile, updateSessionConfig } from "../../../services/api.js";
import { formatNumber } from "../../../utils/numberFormat.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, useWriteStatus } from "./accountShared.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { useNumericEditor } from "./useNumericEditor.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { AccountRow } from "./components/AccountRow.js";
import { AccountSection } from "./components/AccountSection.js";
import { AccountToggleRow } from "./components/AccountToggleRow.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div, option, select, span } = van.tags;

// Saved as priority 1 (High) and 2 (Low); Balanced has none.
const CLICKER_GROUPS = ["orion", "poppy", "tarpit", "bubba"];

const PRIORITIES = [
    { value: 1, label: "High" },
    { value: 2, label: "Low" },
    { value: 0, label: "Balanced" },
];

/** Per-item config states keyed by config id; a missing entry means off, Balanced, no stop-at. */
const createItemStates = () => {
    const items = new Map();

    const get = (id) => {
        const key = String(id);
        if (!items.has(key)) {
            items.set(key, { id, on: van.state(false), stopAt: van.state(null), priority: van.state(0) });
        }
        return items.get(key);
    };

    const sync = (entries) => {
        const byKey = new Map(entries.map((entry) => [String(entry.id), entry]));
        entries.forEach((entry) => get(entry.id));
        for (const [key, item] of items) {
            const entry = byKey.get(key);
            item.on.val = Boolean(entry?.on);
            item.stopAt.val = entry?.stopAt ?? null;
            item.priority.val = entry?.priority === 1 || entry?.priority === 2 ? entry.priority : 0;
        }
    };

    // Switched-off entries stay while they still carry a stop-at or priority, so those survive.
    const toConfig = () =>
        [...items.values()]
            .filter((item) => item.on.val || item.stopAt.val !== null || item.priority.val)
            .map((item) => ({
                id: item.id,
                on: item.on.val,
                ...(item.stopAt.val !== null ? { stopAt: item.stopAt.val } : {}),
                ...(item.priority.val ? { priority: item.priority.val } : {}),
            }));

    return { get, sync, toConfig };
};

const parseWholeNumber = (raw, { max = Infinity, allowEmpty = false, message }) => {
    const text = String(raw ?? "").trim();
    if (allowEmpty && text === "") return null;
    if (!/^\d+$/.test(text) || Number(text) > max) throw new Error(message);
    return Number(text);
};

const stepDraft = (inputValue, delta, max = Infinity) => {
    const text = String(inputValue.val ?? "").trim();
    if (text === "" && delta < 0) return;
    const current = Number(text);
    inputValue.val = String(Math.min(max, Math.max(0, (Number.isFinite(current) ? current : 0) + delta)));
};

/** Inline stop-at box; empty means no limit. */
const StopAtField = ({ item, name, write }) => {
    const { inputValue, status, isDisabled, applyValue, focus, blur, statusMessage } = useNumericEditor({
        valueState: item.stopAt,
        normalize: (raw) => String(raw ?? ""),
        write: async (raw) => {
            const next = parseWholeNumber(raw, {
                allowEmpty: true,
                message: "Stop at must be a whole number of 0 or more",
            });
            await write(next);
            return next;
        },
        format: (value) => (value === null ? "" : String(value)),
    });

    return {
        status,
        node: div(
            { class: "account-stacked-field autobuy-stop-at" },
            span({ class: "account-stacked-field__label" }, "Stop at"),
            NumberInput({
                mode: "int",
                value: inputValue,
                placeholder: "No limit",
                "aria-label": `${name} stop at`,
                disabled: isDisabled,
                onfocus: focus,
                onblur: blur,
                onDecrement: () => !isDisabled() && stepDraft(inputValue, -1),
                onIncrement: () => !isDisabled() && stepDraft(inputValue, 1),
            }),
            ActionButton({
                label: "SET",
                status,
                disabled: isDisabled,
                onClick: (e) => {
                    e.preventDefault();
                    void applyValue();
                },
            }),
            span({ class: "account-write-feedback", role: "status" }, statusMessage)
        ),
    };
};

const PrioritySelect = ({ item, name, write }) => {
    const { status, run } = useWriteStatus();

    return {
        status,
        node: select(
            {
                class: "select-base autobuy-priority",
                "aria-label": `${name} priority`,
                disabled: () => status.val === "loading",
                onchange: (e) => {
                    const target = e.target;
                    void run(() => write(Number(target.value))).then(() => {
                        target.value = String(item.priority.val);
                    });
                },
            },
            ...PRIORITIES.map((entry) =>
                option({ value: entry.value, selected: () => item.priority.val === entry.value }, entry.label)
            )
        ),
    };
};

const WorldShops = ({ world, autobuy }) => {
    const { loading, error, run } = useAccountLoad({ label: `W${world} Autobuy` });
    const stockStates = new Map();
    const listNode = div({ class: "scrollable-panel content-stack" });
    const reconcileShops = createStaticRowReconciler(listNode);

    const ShopRow = ({ key, name }) => {
        const item = autobuy.shops.get(key);
        const stock = getOrCreateState(stockStates, key);
        const stopAt = StopAtField({ item, name, write: (stopAt) => autobuy.setItem("shops", key, { stopAt }) });

        return AccountToggleRow({
            info: div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, name)),
            badge: () => `LEFT ${formatNumber(stock.val)}`,
            checked: () => item.on.val,
            title: "Toggle auto-buy",
            write: (on) => autobuy.setItem("shops", key, { on }),
            rowClass: "account-row--wide-controls autobuy-row",
            controls: stopAt.node,
            status: stopAt.status,
        });
    };

    const load = async () =>
        run(async () => {
            const [shops, config] = await Promise.all([readComputed("autobuy", "shops"), fetchConfig()]);
            autobuy.sync(config.cheatConfig.autobuy, "shops");
            const worldShops = shops.filter((shop) => shop.world === world);

            reconcileShops(
                worldShops.map((shop) => `${shop.shop}:${shop.items.map(({ item }) => item)}`).join("|"),
                () =>
                    worldShops.map((shop) =>
                        AccountSection({
                            title: cleanName(shop.town).toUpperCase(),
                            body: div(
                                { class: "account-item-stack" },
                                shop.items.map(({ item, name }) =>
                                    ShopRow({ key: `${shop.shop}:${item}`, name: cleanName(name) })
                                )
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
            "Switched-on items are bought into the storage chest with chest coins whenever the shop has stock. Buying stops once the chest holds the stop-at amount; leave it empty for no limit.",
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

const SavingRow = ({ autobuy, group }) => {
    const { inputValue, status, isDisabled, applyValue, focus, blur, statusMessage } = useNumericEditor({
        valueState: autobuy.saving[group],
        normalize: (raw) => String(raw ?? ""),
        write: async (raw) => {
            const next = parseWholeNumber(raw, { max: 100, message: "Saving must be a whole number from 0 to 100" });
            await autobuy.setSaving(group, next);
            return next;
        },
        format: (value) => String(value),
    });

    return AccountRow({
        rowClass: "autobuy-saving-row",
        status,
        info: [
            span({ class: "autobuy-saving-row__text" }, "Balanced can spend up to"),
            NumberInput({
                mode: "int",
                value: inputValue,
                "aria-label": "Balanced spending limit while saving, in percent",
                disabled: isDisabled,
                onfocus: focus,
                onblur: blur,
                onDecrement: () => !isDisabled() && stepDraft(inputValue, -1, 100),
                onIncrement: () => !isDisabled() && stepDraft(inputValue, 1, 100),
            }),
            span({ class: "autobuy-saving-row__text" }, "% of what it's saving for"),
        ],
        controls: [
            ActionButton({
                label: "SET",
                status,
                disabled: isDisabled,
                onClick: (e) => {
                    e.preventDefault();
                    void applyValue();
                },
            }),
            span({ class: "account-write-feedback", role: "status" }, statusMessage),
        ],
    });
};

/** One clicker group: its currency section (status + saving) and its upgrade list. */
const ClickerGroup = ({ autobuy, group, currency, upgradesTitle, lockedText }) => {
    const money = van.state(0);
    const rate = van.state(null);
    const status = van.state("");
    const upgradeStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileUpgrades = createStaticRowReconciler(listNode);

    const UpgradeRow = ({ id, name }) => {
        const item = autobuy[group].get(id);
        const upgrade = getOrCreateState(upgradeStates, id, {});
        const stopAt = StopAtField({ item, name, write: (stopAt) => autobuy.setItem(group, id, { stopAt }) });
        const priority = PrioritySelect({
            item,
            name,
            write: (next) => autobuy.setItem(group, id, { priority: next }),
        });

        return AccountToggleRow({
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, name),
                span({ class: "account-row__sub-label" }, () => {
                    if (upgrade.val.maxed) return "Max level";
                    if (!upgrade.val.unlocked) return lockedText(upgrade.val);
                    return `Next level ${formatNumber(upgrade.val.cost)} ${currency}`;
                })
            ),
            badge: () => `LV ${upgrade.val.level ?? 0}`,
            checked: () => item.on.val,
            title: "Toggle auto-buy",
            write: (on) => autobuy.setItem(group, id, { on }),
            rowClass: "account-row--wide-controls autobuy-row",
            controls: [stopAt.node, priority.node],
            status: () => stopAt.status.val ?? priority.status.val,
        });
    };

    const apply = (data) => {
        money.val = data.money;
        rate.val = data.rate;
        const anyOn = data.upgrades.some(({ id }) => autobuy[group].get(id).on.val);
        if (data.waiting) status.val = data.waiting;
        else if (data.goal)
            status.val = `Saving for ${cleanName(data.upgrades[data.goal.id].name)} (${formatNumber(data.goal.cost)})`;
        else status.val = anyOn ? "Buying cheapest first" : "Nothing switched on";

        reconcileUpgrades(data.upgrades.map(({ id }) => id).join("|"), () =>
            data.upgrades.map(({ id, name }) => UpgradeRow({ id, name: cleanName(name) }))
        );
        for (const upgrade of data.upgrades) getOrCreateState(upgradeStates, upgrade.id, {}).val = upgrade;
    };

    const nodes = [
        AccountSection({
            title: currency.toUpperCase(),
            meta: span(
                { class: "account-row__sub-label autobuy-feathers" },
                span(() => `${formatNumber(money.val)} owned`),
                span(() => (rate.val === null ? "" : ` · ${formatNumber(rate.val)} per second`))
            ),
            body: [
                AccountRow({ info: span({ class: "account-row__name" }, () => status.val) }),
                SavingRow({ autobuy, group }),
            ],
        }),
        AccountSection({ title: upgradesTitle, body: listNode }),
    ];

    return { group, apply, nodes };
};

const RULE =
    "It saves for the cheapest High or Low upgrade (High first when both are affordable) and buys Balanced ones cheapest first. Buying stops at the stop-at level; leave it empty for no limit.";

const ClickerPage = ({ autobuy, title, description, groups }) => {
    const { loading, error, run } = useAccountLoad({ label: `${title} Autobuy` });
    const parts = groups.map((group) => ClickerGroup({ autobuy, ...group }));

    const load = async () =>
        run(async () => {
            const [config, ...data] = await Promise.all([
                fetchConfig(),
                ...parts.map(({ group }) => readComputed("autobuy", group)),
            ]);
            parts.forEach(({ group, apply }, index) => {
                autobuy.sync(config.cheatConfig.autobuy, group);
                apply(data[index]);
            });
        });

    load();

    return PersistentAccountListPage({
        title,
        description: `${description} ${RULE}`,
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: `READING ${title}`,
        errorTitle: `${title} READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body: div({ class: "scrollable-panel content-stack" }, ...parts.flatMap(({ nodes }) => nodes)),
    });
};

const producedText = (unit) => (upgrade) => `Unlocks at ${formatNumber(upgrade.unlockAt)} ${unit}`;

const CLICKER_TABS = [
    {
        id: "orion",
        label: "ORION",
        title: "ORION",
        description: "Switched-on upgrades are bought with feathers.",
        groups: [
            { group: "orion", currency: "feathers", upgradesTitle: "UPGRADES", lockedText: producedText("produced") },
        ],
    },
    {
        id: "poppy",
        label: "POPPY",
        title: "POPPY",
        description:
            "Switched-on upgrades are bought while Poppy's menu is open, because her fish only land then. The reset spiral and shiny catching stay manual.",
        groups: [
            { group: "poppy", currency: "fish", upgradesTitle: "UPGRADES", lockedText: producedText("caught") },
            {
                group: "tarpit",
                currency: "tartar fish",
                upgradesTitle: "TAR PIT",
                lockedText: () => "Needs more megafish",
            },
        ],
    },
    {
        id: "bubba",
        label: "BUBBA",
        title: "BUBBA",
        description:
            "Switched-on upgrades are bought with meat once the run's gift is picked. Pats and charisma stay manual.",
        groups: [
            { group: "bubba", currency: "meat", upgradesTitle: "UPGRADES", lockedText: producedText("meat made") },
        ],
    },
];

const SHOP_TABS = [1, 2, 3, 4, 5, 6, 7].map((world) => ({ id: `w${world}`, label: `W${world}`, world }));

const NestedTabs = ({ tabs, renderContent }) => {
    const activeId = van.state(tabs[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs,
            activeId,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs,
                activeId,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-autobuy",
                renderContent,
            })
        )
    );
};

const SECTION_TABS = [
    {
        id: "shops",
        label: "SHOPS",
        render: (autobuy) =>
            NestedTabs({ tabs: SHOP_TABS, renderContent: (tab) => WorldShops({ world: tab.world, autobuy }) }),
    },
    {
        id: "clickers",
        label: "CLICKERS",
        render: (autobuy) =>
            NestedTabs({ tabs: CLICKER_TABS, renderContent: (tab) => ClickerPage({ autobuy, ...tab }) }),
    },
];

/** Shared config state for every autobuy page, so each save carries the whole group. */
const createAutobuyConfig = () => {
    const groups = Object.fromEntries(["shops", ...CLICKER_GROUPS].map((group) => [group, createItemStates()]));
    const saving = Object.fromEntries(CLICKER_GROUPS.map((group) => [group, van.state(10)]));
    const toPatch = (group) =>
        group === "shops"
            ? { shops: groups.shops.toConfig() }
            : { [group]: { saving: saving[group].val, items: groups[group].toConfig() } };
    let queue = Promise.resolve();
    let pendingSaves = 0;

    const persist = async (group) => {
        const result = await updateSessionConfig({ cheatConfig: { autobuy: toPatch(group) } });
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

    // Saves send whole arrays, so run them one at a time; each carries every edit made before it ran.
    const change = async (group, apply, revert) => {
        apply();
        queue = queue.catch(() => {}).then(() => persist(group));
        pendingSaves++;
        try {
            await queue;
        } catch (error) {
            revert();
            throw error;
        } finally {
            pendingSaves--;
        }
    };

    const setItem = (group, id, patch) => {
        const item = groups[group].get(id);
        const previous = Object.fromEntries(Object.keys(patch).map((field) => [field, item[field].val]));
        const assign = (values) => Object.entries(values).forEach(([field, value]) => (item[field].val = value));
        return change(
            group,
            () => assign(patch),
            () => assign(previous)
        );
    };

    const setSaving = (group, next) => {
        const previous = saving[group].val;
        return change(
            group,
            () => (saving[group].val = next),
            () => (saving[group].val = previous)
        );
    };

    // A load that lands while a save is queued would undo the newest edits, so keep the local values then.
    const sync = (config, group) => {
        if (pendingSaves) return;
        if (group === "shops") {
            groups.shops.sync(config.shops);
            return;
        }
        groups[group].sync(config[group].items);
        saving[group].val = config[group].saving;
    };

    return { ...groups, saving, setItem, setSaving, sync };
};

export const AutobuyTab = () => {
    const autobuy = createAutobuyConfig();
    const activeSubTab = van.state(SECTION_TABS[0].id);

    return div(
        { class: "world-tab" },
        renderTabNav({
            tabs: SECTION_TABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: SECTION_TABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => tab.render(autobuy),
            })
        )
    );
};
