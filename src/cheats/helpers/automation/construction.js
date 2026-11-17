import { cList, events, gga, itemDefs } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { settingsById } from "./engine.js";

/**
 * W3 construction. A level takes three clicks of the building's button, all inline in the construction menu's
 * click handler: queue it (free), let the build rate fill its progress, complete it (frees the slot), pay its
 * salt (level +1). These are those steps, with the menu art redrawn only while the menu shows the buildings.
 */

const BUILDINGS = Array.from({ length: 27 }, (_, b) => b);
// TowerInfo[54..61] is the queue; TowerBuildSlots isn't capped and a 9th slot would be cog data.
const QUEUE = 54;
const MAX_SLOTS = 8;
// While empty, the 8th slot feeds the Menagerie side jelly instead.
const JELLY_SLOT = 7;
// Pay columns of cList.TowerInfo and their cost keys; the material column is Blank for every building today.
const COSTS = [
    [4, "TowerSaltCost"],
    [5, "TowerMatCost"],
];

const workbench = (...args) => events(345)._customBlock_WorkbenchStuff(...args);
// The construction menu's behavior: its build rate (_GenINFO[12][0], per hour), tab (_GenINFO[3]) and redraws.
const menu = () => gga.PixelHelperActor[8].behaviors.getBehavior("ActorEvents_481");
// The alchemy menu's behavior holds the owned-items map the pay click checks.
const storage = () => gga.PixelHelperActor[5].behaviors.getBehavior("ActorEvents_232");
const tower = () => gga.TowerInfo;

const maxLevel = (b) => {
    const base = Number(cList.TowerInfo[b][8]);
    return base + workbench("ExtraMaxLvAtom", base, b);
};
const slotCount = () => Math.min(MAX_SLOTS, workbench("TowerBuildSlots", 0, 0) | 0);
const jellyKept = () =>
    slotCount() > JELLY_SLOT && events(189)._customBlock_MenagerieStuff("SideJellyUnlocked", 4, 0) === 1;
const slotOf = (b) =>
    tower()
        .slice(QUEUE, QUEUE + MAX_SLOTS)
        .indexOf(b);
// The menu lets you pick the first building of a row, or one whose left neighbour has a level.
const unlocked = (b) => b % 9 === 0 || tower()[b - 1] > 0;
// Completed but not paid: the built-to level is one ahead.
const awaiting = (b) => tower()[b] !== tower()[b + 27];
const progress = (b) => tower()[66 + b];
const buildReq = (b) => workbench("TowerBuildReq", b, 0);
const costs = (b) =>
    COSTS.filter(([column]) => cList.TowerInfo[b][column] !== "Blank").map(([column, key]) => ({
        item: String(cList.TowerInfo[b][column]),
        cost: workbench(key, b, 0),
    }));
// The game's busy flag; complete and pay show a popup instead while it is set.
const busy = () => gga.OptionsListAccount[34] !== 0;

// What removeitems(..., "InventoryStorage") can take: the active character's inventory, the first refinery
// storage slot holding it, then the chest. The game's own map counts more, so this keeps a pay from falling short.
function reachable(item) {
    let total = 0;
    for (let i = 0; i < gga.InventorySlotsOwned; i++) if (gga.InventoryOrder[i] === item) total += gga.ItemQuantity[i];
    const refinery = gga.Refinery[1].indexOf(item);
    if (item.includes("Refinery") && refinery >= 0 && refinery < 8) total += gga.Refinery[2][refinery];
    for (let i = 0; i < gga.ChestSlotsOwned; i++) if (gga.ChestOrder[i] === item) total += gga.ChestQuantity[i];
    return total;
}

// The pay click's check against the owned-items map, refreshed first since it goes stale with the menu closed
// (only once the salt is there, so waiting buildings don't rebuild it every second).
const affordable = (b) => {
    if (!costs(b).every(({ item, cost }) => reachable(item) >= cost)) return false;
    const menu232 = storage();
    menu232._TRIGGERtext = "z";
    menu232._customEvent_PostOfficeIMG();
    return costs(b).every(({ item, cost }) => menu232._ItemsAndStorageOWNED.h[item] >= cost);
};

// The menu's own redraws attach the construction art to the screen, so they only run while it shows the buildings.
// "nop" redraws the slots and the selected building's panel; with none selected only the slots ("p"), since "o" throws.
const slotsAndPanel = () => ["_customEvent_WorkbenchStuff2", menu()._GenINFO[17] === -1 ? "p" : "nop"];
const redraw = (...steps) => {
    if (gga.MenuType2 !== 28 || menu()._GenINFO[3] !== 0) return;
    for (const [event, text] of steps) {
        menu()._TRIGGEREDtext = text;
        menu()[event]();
    }
};

function queue(b, slot) {
    if (gga.OptionsListAccount[406] === 0) gga.OptionsListAccount[406] = 1;
    tower()[QUEUE + slot] = b;
    redraw(["_customEvent_WorkbenchStuff2", "p"]);
}

function complete(b) {
    tower()[b + 27] += 1;
    tower()[66 + b] = 0;
    for (let s = 0; s < MAX_SLOTS; s++) if (tower()[QUEUE + s] === b) tower()[QUEUE + s] = -1;
    redraw(slotsAndPanel());
}

function pay(b) {
    for (const { item, cost } of costs(b)) events(189)._customBlock_removeitems(item, cost, "InventoryStorage");
    // A shrine's first level makes it placeable.
    if (b > 17 && tower()[b] < 1) gga.ShrineInfo[b - 18][3] = 1;
    tower()[b] += 1;
    storage()._TRIGGERtext = "z";
    gga.PixelHelperActor[5].shout("_customEvent_PostOfficeIMG");
    redraw(["_customEvent_WorkbenchStuff", "be"], slotsAndPanel());
    if (gga.OptionsListAccount[406] === 9) gga.OptionsListAccount[406] = 10;
}

/** The panel's "Current Bonuses" lines with its numbers; empty before the first level, like the panel. */
function bonusText(b) {
    const row = cList.TowerInfo[b];
    const level = tower()[b];
    if (!(level > 0)) return "";
    let text = String(row[1])
        .split("{")
        .join(String(Math.floor((level - 1) * Number(row[2]))))
        .split("}")
        .join(String(Math.floor((level - 1) * Number(row[3]))))
        .split("$")
        .join(String(Math.floor(level * Number(row[2]))));
    // Dancing Coral adds a line to the first shrines.
    if (b > 17 && gga.Spelunk[4][6] > b - 18) {
        const coral = events(579)._customBlock_Thingies("DancingCoralBonus", b - 18, 0);
        text =
            `${text.split("Level_it_up_by_claiming_AFK_Gains_on_the_same_map.").join("")}_@_${cList.Spelunky[23][b - 18]}`
                .split("{")
                .join(String(Math.floor(10 * coral) / 10))
                .split("}")
                .join(
                    events(124)
                        ._customBlock_NotateNumber(1 + coral / 100, "MultiplierInfo")
                        .split("#")
                        .join("")
                );
    }
    const [, bonuses = ""] = text.split("Current_Bonuses:");
    return bonuses
        .split("@")
        .map((line) => line.split("_").join(" ").trim())
        .filter(Boolean)
        .join(" · ");
}

/** Queue state and every building's row data for the Account > Automation tab. */
export function getAutomationConstruction() {
    const rate = menu()._GenINFO[12][0];
    const count = slotCount();
    const gilded = workbench("TotalGildedSlots", 0, 0);
    const boost = workbench("TotalGildedBoostio", 0, 0);
    return {
        slots: count,
        building: tower()
            .slice(QUEUE, QUEUE + count)
            .filter((b) => b !== -1).length,
        jelly: jellyKept(),
        rate,
        busy: busy(),
        buildings: BUILDINGS.map((b) => {
            const row = cList.TowerInfo[b];
            const slot = slotOf(b);
            const need = buildReq(b);
            const slotRate = slot >= 0 && slot < count ? rate * (slot < gilded ? boost : 1) : 0;
            const [salt] = costs(b);
            return {
                id: b,
                name: String(row[0]),
                bonus: bonusText(b),
                level: tower()[b],
                max: maxLevel(b),
                maxed: tower()[b] >= maxLevel(b),
                unlocked: unlocked(b),
                previous: b % 9 ? String(cList.TowerInfo[b - 1][0]) : null,
                cost: salt.cost,
                currency: itemDefs[salt.item].h.displayName,
                awaiting: awaiting(b),
                slot,
                percent: need > 0 ? Math.min(100, (100 * progress(b)) / need) : 100,
                hoursLeft: slotRate > 0 ? Math.max(0, need - progress(b)) / slotRate : null,
            };
        }),
    };
}

export function runConstruction() {
    const items = cheatConfig.automation.construction.items;
    if (!items.some((entry) => entry.on)) return;
    const settings = settingsById(items);
    // High, Low, then Balanced (switched-off buildings you queued count as Balanced).
    const rank = (b) => {
        const priority = settings.get(String(b))?.priority;
        return priority === 1 ? 0 : priority === 2 ? 1 : 2;
    };
    const queueable = (b) => {
        const entry = settings.get(String(b));
        return entry?.on && unlocked(b) && !awaiting(b) && tower()[b] < Math.min(maxLevel(b), entry.stopAt ?? Infinity);
    };

    if (!busy()) {
        // Progress past the requirement is lost, so complete as soon as it fills; a full building the button
        // would queue gets completed instead, as the button does.
        for (const b of BUILDINGS) {
            if (
                (slotOf(b) >= 0 || queueable(b)) &&
                !awaiting(b) &&
                tower()[b] < maxLevel(b) &&
                progress(b) >= buildReq(b)
            )
                complete(b);
        }
        // Every completed building is paid once its salt is there; on a shared salt, High, Low, Balanced, cheapest first.
        const unpaid = BUILDINGS.filter(awaiting).map((b) => ({ b, rank: rank(b), cost: costs(b)[0].cost }));
        unpaid.sort((x, y) => x.rank - y.rank || x.cost - y.cost);
        for (const { b } of unpaid) if (affordable(b)) pay(b);
    }

    // Free slots take High, Low, then Balanced buildings, the one closest to done first.
    const free = Array.from({ length: slotCount() }, (_, s) => s).filter(
        (s) => tower()[QUEUE + s] === -1 && !(s === JELLY_SLOT && jellyKept())
    );
    const left = (b) => buildReq(b) - progress(b);
    const picks = BUILDINGS.filter((b) => queueable(b) && slotOf(b) < 0 && left(b) > 0).sort(
        (x, y) => rank(x) - rank(y) || left(x) - left(y)
    );
    free.forEach((slot, i) => {
        if (i < picks.length) queue(picks[i], slot);
    });
}
