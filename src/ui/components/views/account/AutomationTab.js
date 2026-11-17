/**
 * Automation Tab
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
const CLICKER_GROUPS = ["orion", "poppy", "tarpit", "bubba", "grimoire", "sneaking", "summoning"];

// Summoning essence colours in the game's order; each gets its own section and saving %.
const ESSENCES = ["white", "green", "yellow", "blue", "purple", "red", "cyan", "teal"];

const PRIORITIES = [
    { value: 1, label: "High" },
    { value: 2, label: "Low" },
    { value: 0, label: "Balanced" },
];

// Bubbles: what a row pays with; Materials is the default and isn't saved.
const PAY_CHOICES = [
    { value: "materials", label: "Materials" },
    { value: "particles", label: "Particles" },
];

/** Per-item config states keyed by config id; a missing entry means off, Balanced, no stop-at, pays with materials. */
const createItemStates = () => {
    const items = new Map();

    const get = (id) => {
        const key = String(id);
        if (!items.has(key)) {
            items.set(key, {
                id,
                on: van.state(false),
                stopAt: van.state(null),
                priority: van.state(0),
                pay: van.state("materials"),
            });
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
            item.pay.val = entry?.pay === "particles" ? "particles" : "materials";
        }
    };

    // Switched-off entries stay while they still carry a stop-at, priority or pay choice, so those survive.
    const toConfig = () =>
        [...items.values()]
            .filter(
                (item) => item.on.val || item.stopAt.val !== null || item.priority.val || item.pay.val !== "materials"
            )
            .map((item) => ({
                id: item.id,
                on: item.on.val,
                ...(item.stopAt.val !== null ? { stopAt: item.stopAt.val } : {}),
                ...(item.priority.val ? { priority: item.priority.val } : {}),
                ...(item.pay.val !== "materials" ? { pay: item.pay.val } : {}),
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
            { class: "account-stacked-field automation-stop-at" },
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

/** A row's dropdown setting (priority, pay with), saved on change and reset to the saved value after. */
const ChoiceSelect = ({ state, choices, label, write }) => {
    const { status, run } = useWriteStatus();

    return {
        status,
        node: select(
            {
                class: "select-base automation-priority",
                "aria-label": label,
                disabled: () => status.val === "loading",
                onchange: (e) => {
                    const target = e.target;
                    const choice = choices.find((entry) => String(entry.value) === target.value);
                    void run(() => write(choice.value)).then(() => {
                        target.value = String(state.val);
                    });
                },
            },
            ...choices.map((entry) =>
                option({ value: entry.value, selected: () => state.val === entry.value }, entry.label)
            )
        ),
    };
};

const WorldShops = ({ world, automation }) => {
    const { loading, error, run } = useAccountLoad({ label: `W${world} Automation` });
    const stockStates = new Map();
    const listNode = div({ class: "scrollable-panel content-stack" });
    const reconcileShops = createStaticRowReconciler(listNode);

    const ShopRow = ({ key, name }) => {
        const item = automation.shops.get(key);
        const stock = getOrCreateState(stockStates, key);
        const stopAt = StopAtField({ item, name, write: (stopAt) => automation.setItem("shops", key, { stopAt }) });

        return AccountToggleRow({
            info: div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, name)),
            badge: () => `LEFT ${formatNumber(stock.val)}`,
            checked: () => item.on.val,
            title: "Toggle auto-buy",
            write: (on) => automation.setItem("shops", key, { on }),
            rowClass: "account-row--wide-controls automation-row",
            controls: stopAt.node,
            status: stopAt.status,
        });
    };

    const load = async () =>
        run(async () => {
            const [shops, config] = await Promise.all([readComputed("automation", "shops"), fetchConfig()]);
            automation.sync(config.cheatConfig.automation, "shops");
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

/** A page-wide % setting: text, a number box, more text and SET. */
const PercentRow = ({ valueState, write, max, message, before, after, label }) => {
    const { inputValue, status, isDisabled, applyValue, focus, blur, statusMessage } = useNumericEditor({
        valueState,
        normalize: (raw) => String(raw ?? ""),
        write: async (raw) => {
            const next = parseWholeNumber(raw, { max, message });
            await write(next);
            return next;
        },
        format: (value) => String(value),
    });

    return AccountRow({
        rowClass: "automation-saving-row",
        status,
        info: [
            span({ class: "automation-saving-row__text" }, before),
            NumberInput({
                mode: "int",
                value: inputValue,
                "aria-label": label,
                disabled: isDisabled,
                onfocus: focus,
                onblur: blur,
                onDecrement: () => !isDisabled() && stepDraft(inputValue, -1, max),
                onIncrement: () => !isDisabled() && stepDraft(inputValue, 1, max),
            }),
            span({ class: "automation-saving-row__text" }, after),
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

/**
 * One clicker group: its currency section (status + saving) and its upgrade list.
 * With currencyIndex it shows only that currency's upgrades, all in one section (Summoning colours).
 */
const ClickerGroup = ({ automation, group, currency, currencyIndex, upgradesTitle, lockedText }) => {
    const owned = van.state("");
    const rate = van.state(null);
    const status = van.state([]);
    const upgradeStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileUpgrades = createStaticRowReconciler(listNode);

    const UpgradeRow = ({ id, name }) => {
        const item = automation[group].get(id);
        const upgrade = getOrCreateState(upgradeStates, id, {});
        const stopAt = StopAtField({ item, name, write: (stopAt) => automation.setItem(group, id, { stopAt }) });
        const priority = ChoiceSelect({
            state: item.priority,
            choices: PRIORITIES,
            label: `${name} priority`,
            write: (next) => automation.setItem(group, id, { priority: next }),
        });

        return AccountToggleRow({
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, name),
                span({ class: "account-row__sub-label automation-bonus", hidden: () => !upgrade.val.bonus }, () =>
                    cleanName(upgrade.val.bonus)
                ),
                span(
                    { class: "account-row__sub-label", hidden: () => !upgrade.val.note },
                    () => upgrade.val.note ?? ""
                ),
                span({ class: "account-row__sub-label" }, () => {
                    if (upgrade.val.maxed) return "Max level";
                    if (!upgrade.val.unlocked) return lockedText(upgrade.val);
                    return `Next level ${formatNumber(upgrade.val.cost)} ${upgrade.val.currency ?? currency}`;
                })
            ),
            badge: () => `LV ${upgrade.val.level ?? 0}`,
            checked: () => item.on.val,
            title: "Toggle auto-buy",
            write: (on) => automation.setItem(group, id, { on }),
            rowClass: "account-row--wide-controls automation-row",
            controls: [stopAt.node, priority.node],
            status: () => stopAt.status.val ?? priority.status.val,
        });
    };

    const apply = (data) => {
        const currencies = currencyIndex === undefined ? data.currencies : [data.currencies[currencyIndex]];
        const upgrades =
            currencyIndex === undefined
                ? data.upgrades
                : data.upgrades.filter((upgrade) => upgrade.currency === currencies[0].name);
        // Grimoire has one currency per bone type; each gets its own owned count and status line.
        const several = currencies.length > 1;
        owned.val = several
            ? currencies.map(({ name, money }) => `${formatNumber(money)} ${name}`).join(" · ")
            : `${formatNumber(currencies[0].money)} owned`;
        rate.val = data.rate;
        const anyOn = upgrades.some(({ id }) => automation[group].get(id).on.val);
        if (data.waiting) status.val = [data.waiting];
        else if (!anyOn) status.val = ["Nothing switched on"];
        else
            status.val = currencies.map(({ name, goal }) => {
                const text = goal
                    ? `Saving for ${cleanName(upgrades.find(({ id }) => id === goal.id).name, "", { stripMarker: true })} (${formatNumber(goal.cost)})`
                    : "Buying cheapest first";
                return several ? `${name[0].toUpperCase()}${name.slice(1)}: ${text}` : text;
            });

        reconcileUpgrades(upgrades.map(({ id }) => id).join("|"), () =>
            upgrades.map(({ id, name }) => UpgradeRow({ id, name: cleanName(name, "", { stripMarker: true }) }))
        );
        for (const upgrade of upgrades) getOrCreateState(upgradeStates, upgrade.id, {}).val = upgrade;
    };

    const head = [
        AccountRow({
            info: () =>
                div(
                    { class: "account-row__name-group" },
                    ...status.val.map((line) => span({ class: "account-row__name" }, line))
                ),
        }),
        PercentRow({
            valueState:
                currencyIndex === undefined ? automation.saving[group] : automation.saving[group][currencyIndex],
            write: (next) => automation.setSaving(group, next, currencyIndex),
            max: 100,
            message: "Saving must be a whole number from 0 to 100",
            before: "Balanced can spend up to",
            after: "% of what it's saving for",
            label: "Balanced spending limit while saving, in percent",
        }),
    ];
    const currencySection = (body) =>
        AccountSection({
            title: currency.toUpperCase(),
            meta: span(
                { class: "account-row__sub-label automation-feathers" },
                span(() => owned.val),
                span(() => (rate.val === null ? "" : ` · ${formatNumber(rate.val)} per second`))
            ),
            body,
        });
    const nodes = upgradesTitle
        ? [currencySection(head), AccountSection({ title: upgradesTitle, body: listNode })]
        : [currencySection([...head, listNode])];

    return { group, apply, nodes };
};

const RULE =
    "It saves for the cheapest High or Low upgrade (High first when both are affordable) and buys Balanced ones cheapest first. Buying stops at the stop-at level; leave it empty for no limit.";

const ClickerPage = ({ automation, title, description, groups }) => {
    const { loading, error, run } = useAccountLoad({ label: `${title} Automation` });
    const parts = groups.map((group) => ClickerGroup({ automation, ...group }));

    const load = async () =>
        run(async () => {
            // Summoning's colour sections share one group, so read each group once.
            const names = [...new Set(parts.map(({ group }) => group))];
            const [config, ...data] = await Promise.all([
                fetchConfig(),
                ...names.map((group) => readComputed("automation", group)),
            ]);
            names.forEach((group) => automation.sync(config.cheatConfig.automation, group));
            parts.forEach(({ group, apply }) => apply(data[names.indexOf(group)]));
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
                dataAttr: "data-automation",
                renderContent,
            })
        )
    );
};

const MASTERCLASS_TABS = [
    {
        id: "grimoire",
        label: "GRIMOIRE",
        title: "GRIMOIRE",
        description:
            "Switched-on upgrades are bought with bones, each bone type on its own. Bones only drop while your Death Bringer plays; buying works on any character.",
        groups: [
            {
                group: "grimoire",
                currency: "bones",
                upgradesTitle: "UPGRADES",
                lockedText: (upgrade) => `Unlocks at ${formatNumber(upgrade.unlockAt)} total levels`,
            },
        ],
    },
];

// A bubble's next cost: every slot, or the particle buy for a Particles row.
const bubbleCostText = (bubble, pay) => {
    if (pay === "particles") {
        if (bubble.particle.waiting) return bubble.particle.waiting;
        const liquids = bubble.costs.filter(({ liquid }) => liquid);
        return `Next level ${[
            `${formatNumber(bubble.particle.cost)} particles`,
            "1 charge",
            ...liquids.map(({ cost, name }) => `${formatNumber(cost)} ${name}`),
        ].join(", ")}`;
    }
    const short = bubble.costs.filter((slot) => slot.short).map(({ name }) => name);
    const costs = bubble.costs.map(({ cost, name }) => `${formatNumber(cost)} ${cleanName(name)}`).join(", ");
    return `Next level ${costs}${short.length ? ` · not enough ${cleanName(short.join(", "))}` : ""}`;
};

/** SKILLS > BUBBLES: one target % for every decay bubble, one section per cauldron, a row per bubble. */
const BubblesPage = ({ automation, title, description }) => {
    const { loading, error, run } = useAccountLoad({ label: `${title} Automation` });
    const waiting = van.state(null);
    const particles = van.state(null);
    const ids = van.state([]);
    const bubbleStates = new Map();
    const listNode = div({ class: "content-stack" });
    const reconcileCauldrons = createStaticRowReconciler(listNode);

    const BubbleRow = ({ id, name }) => {
        const item = automation.bubbles.get(id);
        const bubble = getOrCreateState(bubbleStates, id, {});
        const write = (patch) => automation.setItem("bubbles", id, patch);
        const stopAt = StopAtField({ item, name, write: (next) => write({ stopAt: next }) });
        const pay = ChoiceSelect({
            state: item.pay,
            choices: PAY_CHOICES,
            label: `${name} pay with`,
            write: (next) => write({ pay: next }),
        });

        return AccountToggleRow({
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, name),
                span({ class: "account-row__sub-label automation-bonus" }, () => cleanName(bubble.val.bonus)),
                span({ class: "account-row__sub-label" }, () => {
                    if (!bubble.val.costs) return "";
                    if (!(bubble.val.level > 0)) return "Not discovered yet";
                    if (bubble.val.percent === null && item.stopAt.val === null)
                        return "No max level: set a stop-at to raise it";
                    return bubbleCostText(bubble.val, item.pay.val);
                })
            ),
            badge: () => {
                const { level = 0, percent = null } = bubble.val;
                return `LV ${level} · ${percent === null ? "no max" : `${(Math.floor(10 * percent) / 10).toFixed(1)}%`}`;
            },
            checked: () => item.on.val,
            title: "Toggle auto-buy",
            write: (on) => write({ on }),
            rowClass: "account-row--wide-controls automation-row",
            controls: [stopAt.node, pay.node],
            status: () => stopAt.status.val ?? pay.status.val,
        });
    };

    const load = async () =>
        run(async () => {
            const [data, config] = await Promise.all([readComputed("automation", "bubbles"), fetchConfig()]);
            automation.sync(config.cheatConfig.automation, "bubbles");
            waiting.val = data.waiting;
            particles.val = data.atoms ? { owned: data.particles, charges: data.charges } : null;
            const bubbles = data.cauldrons.flatMap((cauldron) => cauldron.bubbles);
            ids.val = bubbles.map(({ id }) => id);

            reconcileCauldrons(bubbles.map(({ id }) => id).join("|"), () =>
                data.cauldrons.map((cauldron) =>
                    AccountSection({
                        title: cauldron.name,
                        body: div(
                            { class: "account-item-stack" },
                            cauldron.bubbles.map(({ id, name }) => BubbleRow({ id, name: cleanName(name) }))
                        ),
                    })
                )
            );
            for (const bubble of bubbles) getOrCreateState(bubbleStates, bubble.id, {}).val = bubble;
        });

    load();

    const head = AccountSection({
        title: "BUBBLES",
        meta: span({ class: "account-row__sub-label automation-feathers" }, () =>
            particles.val
                ? `${formatNumber(particles.val.owned)} particles · ${formatNumber(particles.val.charges)} particle charges`
                : ""
        ),
        body: [
            AccountRow({
                info: () =>
                    span(
                        { class: "account-row__name" },
                        waiting.val ??
                            (ids.val.some((id) => automation.bubbles.get(id).on.val)
                                ? `Raising bubbles to ${automation.bubbleTarget.val}%`
                                : "Nothing switched on")
                    ),
            }),
            PercentRow({
                valueState: automation.bubbleTarget,
                write: (next) => automation.setBubbleTarget(next),
                max: 99,
                message: "Target must be a whole number from 0 to 99",
                before: "Raise bubbles to",
                after: "% of their max",
                label: "Bubble target, in percent of max",
            }),
        ],
    });

    return PersistentAccountListPage({
        title,
        description,
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: `READING ${title}`,
        errorTitle: `${title} READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body: div({ class: "scrollable-panel content-stack" }, head, listNode),
    });
};

const SKILL_TABS = [
    {
        id: "sneaking",
        label: "SNEAKING",
        title: "SNEAKING",
        description:
            "Switched-on Ninja Knowledge upgrades are bought with jade coins. They have no max level, so give each a stop-at unless it should take all your jade.",
        groups: [
            {
                group: "sneaking",
                currency: "jade",
                upgradesTitle: "NINJA KNOWLEDGE",
                // The row's first render runs before its data lands, so unlockAt may be missing.
                lockedText: ({ unlockAt: { parent, reef } = {} }) => {
                    if (reef) return `Unlocks at level ${reef} of W7 Coral Reef's Ninja Knowledge upgrade`;
                    return parent ? `Unlocks once ${cleanName(parent)} has a level` : "Unlocks with Sneaking mastery";
                },
            },
        ],
    },
    {
        id: "bubbles",
        label: "BUBBLES",
        title: "BUBBLES",
        description:
            "Switched-on W2 alchemy bubbles are raised to the target % of their max, the one furthest behind first; if it can't be afforded, the next one buys. Bubbles without a max need a stop-at, and a stop-at also caps any bubble. A Particles row waits until the particle buy opens for it (Atom Collider, a first cost of 100M or more, a charge). Buying pauses while you hold Bargain Tags, since any bubble buy uses them all, and while the alchemy menu is open. Free extra levels can pass the stop-at.",
        render: BubblesPage,
    },
    {
        id: "summoning",
        label: "SUMMONING",
        title: "SUMMONING",
        description:
            "Switched-on summoning board upgrades are bought with essence, each colour saving and buying on its own. Buying pauses while the board is open. Doubler slots stay manual.",
        groups: ESSENCES.map((colour, currencyIndex) => ({
            group: "summoning",
            currency: `${colour} essence`,
            currencyIndex,
            lockedText: ({ unlockAt: { parent, lore } = {} }) =>
                lore
                    ? "Unlocks once Spelunking's Lore Boss 5 is beaten"
                    : `Unlocks once ${cleanName(parent)} has a level`,
        })),
    },
];

const SECTION_TABS = [
    {
        id: "shops",
        label: "SHOPS",
        render: (automation) =>
            NestedTabs({ tabs: SHOP_TABS, renderContent: (tab) => WorldShops({ world: tab.world, automation }) }),
    },
    {
        id: "clickers",
        label: "CLICKERS",
        render: (automation) =>
            NestedTabs({ tabs: CLICKER_TABS, renderContent: (tab) => ClickerPage({ automation, ...tab }) }),
    },
    {
        id: "skills",
        label: "SKILLS",
        render: (automation) =>
            NestedTabs({
                tabs: SKILL_TABS,
                renderContent: (tab) => (tab.render ?? ClickerPage)({ automation, ...tab }),
            }),
    },
    {
        id: "masterclasses",
        label: "MASTERCLASSES",
        render: (automation) =>
            NestedTabs({ tabs: MASTERCLASS_TABS, renderContent: (tab) => ClickerPage({ automation, ...tab }) }),
    },
];

/** Shared config state for every automation page, so each save carries the whole group. */
const createAutomationConfig = () => {
    const groups = Object.fromEntries(
        ["shops", "bubbles", ...CLICKER_GROUPS].map((group) => [group, createItemStates()])
    );
    const bubbleTarget = van.state(90);
    // Summoning saves one % per essence colour.
    const saving = Object.fromEntries(
        CLICKER_GROUPS.map((group) => [
            group,
            group === "summoning" ? ESSENCES.map(() => van.state(10)) : van.state(10),
        ])
    );
    const savingValue = (group) =>
        Array.isArray(saving[group]) ? saving[group].map((state) => state.val) : saving[group].val;
    const toPatch = (group) => {
        if (group === "shops") return { shops: groups.shops.toConfig() };
        if (group === "bubbles") return { bubbles: { target: bubbleTarget.val, items: groups.bubbles.toConfig() } };
        return { [group]: { saving: savingValue(group), items: groups[group].toConfig() } };
    };
    let queue = Promise.resolve();
    let pendingSaves = 0;

    const persist = async (group) => {
        const result = await updateSessionConfig({ cheatConfig: { automation: toPatch(group) } });
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

    const setSaving = (group, next, currencyIndex) => {
        const state = currencyIndex === undefined ? saving[group] : saving[group][currencyIndex];
        const previous = state.val;
        return change(
            group,
            () => (state.val = next),
            () => (state.val = previous)
        );
    };

    const setBubbleTarget = (next) => {
        const previous = bubbleTarget.val;
        return change(
            "bubbles",
            () => (bubbleTarget.val = next),
            () => (bubbleTarget.val = previous)
        );
    };

    // A load that lands while a save is queued would undo the newest edits, so keep the local values then.
    const sync = (config, group) => {
        if (pendingSaves) return;
        if (group === "shops") {
            groups.shops.sync(config.shops);
            return;
        }
        if (group === "bubbles") {
            groups.bubbles.sync(config.bubbles.items);
            bubbleTarget.val = config.bubbles.target;
            return;
        }
        groups[group].sync(config[group].items);
        if (Array.isArray(saving[group])) saving[group].forEach((state, i) => (state.val = config[group].saving[i]));
        else saving[group].val = config[group].saving;
    };

    return { ...groups, saving, bubbleTarget, setItem, setSaving, setBubbleTarget, sync };
};

export const AutomationTab = () => {
    const automation = createAutomationConfig();
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
                renderContent: (tab) => tab.render(automation),
            })
        )
    );
};
