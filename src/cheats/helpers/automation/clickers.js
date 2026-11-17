import { behavior, cList, events, gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { buyCheapestFirst, nextGoal, settingsById } from "./engine.js";

const ola = () => gga.OptionsListAccount;
const summoning = (...args) => events(579)._customBlock_Summoning(...args);
const bubbastuff = (...args) => events(579)._customBlock_Bubbastuff(...args);
const ninja = (...args) => events(579)._customBlock_Ninja(...args);
const cooking = (...args) => events(345)._customBlock_CookingR(...args);
// The clickers' own buy events: Orion and Poppy share the owl behavior, Bubba has his own.
const owl = () => gga.PixelHelperActor[25].behaviors.getBehavior("ActorEvents_670");
const seal = () => gga.PixelHelperActor[26].behaviors.getBehavior("ActorEvents_713");
// The summoning board's behavior; _GenINFO[170] is its cached total level / 100.
const board = () => gga.PixelHelperActor[24].behaviors.getBehavior("ActorEvents_623");
const trigger = (target, event, text) => {
    target._TRIGGEREDtext = text;
    target[event]();
};

// Bubba's buy event draws menu art (dice, smoked meat, ...) onto the screen even with his menu closed.
// Remove what it attached the way the event itself does; an open menu (94) keeps its art.
const clearSealArt = () => {
    if (gga.MenuType2 === 94) return;
    const { _UIinventory16: images, _UIinventory16On: shown } = seal();
    for (const slot of [86, 87, 88, 89, 90, 91, 94, 95]) {
        if (Array.isArray(shown[slot])) {
            shown[slot].forEach((on, i) => {
                if (on !== 1) return;
                behavior.removeImage(images[slot][i]);
                shown[slot][i] = 0;
            });
        } else if (shown[slot] === 1) {
            behavior.removeImage(images[slot]);
            shown[slot] = 0;
        }
    }
};

// Summoning essence colours (Summon[2] order), and familiar tiers (Summon[4]) named after their units.
const ESSENCES = ["white", "green", "yellow", "blue", "purple", "red", "cyan", "teal"];
const FAMILIARS = ["Slime", "Vrumbi", "Bloomy", "Tonka", "Regalis", "Sparkie", "Guardio", "Muddah"];
// Board rows whose "}" total multiplies the bonus by that colour's wins, or by the character's Summoning level.
const SUMMON_VICTORY_ROWS = [0, 11, 18, 27, 38, 46, 54, 73];
const SUMMON_LEVEL_ROWS = [65, 66, 67, 30, 40, 52, 58, 80];
// A kitchen's three upgrades, Cooking[k][6..8].
const KITCHEN_SLOTS = ["Speed", "Fire", "Luck"];

// The Familiar row's extra roll after its level is bought, as the board click does it.
const summonFamiliar = () => {
    const familiars = gga.Summon[4];
    const add = (tier) => (familiars[tier] = Math.min(30, Math.round(Number(familiars[tier]) + 1)));
    // Free familiar: the level comes back, the essence stays spent.
    if (behavior.randomFloat() < Math.min(0.8, events(579)._customBlock_Thingies("LegendPTS_bonus", 4, 0) / 100))
        gga.Summon[0][2] = Math.round(Math.max(0, gga.Summon[0][2] - 1));
    const skipping = summoning("SummUpgBonus", 39, 0);
    let tier = 0;
    if (skipping > 0.5) {
        if (behavior.randomFloat() < 0.125 * (1 + skipping / 100)) tier = 1;
        else if (behavior.randomFloat() < 0.02 * (1 + skipping / 100)) tier = 2;
    }
    add(tier);
    if (behavior.randomFloat() < events(345)._customBlock_getbonus2(2, 596, -1) / 100) add(tier);
    // Familiar_Merging: 3 + t of tier t become one of the next tier.
    if (summoning("SummUpgBonus", 6, 0) > 0) {
        for (let t = 0; t < 7; t++) {
            if (familiars[t] >= 3 + t) {
                familiars[t] = Math.round(familiars[t] - (3 + t));
                familiars[t + 1] = Math.round(Number(familiars[t + 1]) + 1);
            }
        }
    }
    // The sprite redraw this skips also flags the "have a Regalis" quest step.
    if (gga.QuestComplete.h.Sussy_Gene3 === 0 && familiars[4] >= 1) gga.QuestStatus.h.Sussy_Gene3[0] = 1;
};

/**
 * Each clicker: its currency, upgrade rows, level, next cost, unlock rule (the buy events skip it),
 * buy call, and why it has to wait right now (null when it may buy).
 */
const CLICKERS = {
    // OLA 253 feathers, 254 + i levels, 263 feathers produced this run. Owlz rows 0-8; 4 = Feather Restart, 8 = Mega Reset.
    orion: {
        rows: () => cList.Owlz.slice(0, 9),
        money: () => ola()[253],
        rate: () => summoning("OwlFeatherRate", 0, 0),
        level: (i) => ola()[254 + i],
        cost: (i) => summoning("OwlCost", i, 0),
        unlockAt: (i, row) => (i === 0 ? 0 : Number(row[3])),
        progress: () => ola()[263],
        buy: (i) => trigger(owl(), "_customEvent_OwlStuffz", `a${i}`),
        waiting: () => null,
    },
    // OLA 267 fish, 268 + i levels, 280 fish caught this run. Owlz rows 9-20; 6 = Fisheroo Reset, 11 = Greatest Catch.
    poppy: {
        rows: () => cList.Owlz.slice(9, 21),
        money: () => ola()[267],
        level: (i) => ola()[268 + i],
        cost: (i) => summoning("RooCost", i, 0),
        unlockAt: (i, row) => (i === 0 ? 0 : Number(row[3])),
        progress: () => ola()[280],
        // The game refuses both resets mid shiny catch.
        canBuy: (i) => (i !== 6 && i !== 11) || owl()._GenINFO[22] === 0,
        buy: (i) => trigger(owl(), "_customEvent_OwlStuffz", `b${i}`),
        // Fish only land while Poppy's menu is open; closed they wait in a timer.
        waiting: () => (gga.MenuType2 === 65 ? null : "Waiting for Poppy's menu to be open"),
    },
    // OLA 296 tartar fish, 297 + i levels. Owlz rows 21-28; RooTarOwned of them are open (grows with megafish).
    tarpit: {
        rows: () => cList.Owlz.slice(21, 29),
        money: () => ola()[296],
        level: (i) => ola()[297 + i],
        cost: (i) => summoning("RooCost_T", i, 0),
        unlockAt: () => null,
        isUnlocked: (i) => i < summoning("RooTarOwned", 0, 0),
        buy: (i) => trigger(owl(), "_customEvent_OwlStuffz", `h${i}`),
        waiting: () => (gga.MenuType2 === 65 ? null : "Waiting for Poppy's menu to be open"),
    },
    // Bubba[0][0] meat, Bubba[1][i] levels, Bubba[0][4] meat made this run. BubbaUpg rows; 8 = Megaflesh, max 999 = none.
    bubba: {
        rows: () => cList.BubbaUpg,
        money: () => gga.Bubba[0][0],
        level: (i) => gga.Bubba[1][i],
        cost: (i) => bubbastuff("UpgCost", i, 0),
        unlockAt: (i) => bubbastuff("MeatProdREQ", i, 0),
        progress: () => gga.Bubba[0][4],
        max: (row) => (Number(row[4]) === 999 ? Infinity : Number(row[4])),
        buy: (i) => {
            trigger(seal(), "_customEvent_Bubbathings", `Z${i}`);
            clearSealArt();
            // Meat income reads a cached level total that only refreshes while the menu is open.
            bubbastuff("TotalQTYofLVs", 0, 99);
        },
        waiting: () => {
            if (!bubbastuff("BubbaUnlocked", 0, 0)) return "Bubba isn't unlocked yet";
            // The menu blocks buying until the run's gift is picked; the buy event doesn't, so wait here.
            return bubbastuff("DoWeNeedToSelectGift", 0, 0) ? "Waiting for you to pick a gift" : null;
        },
    },
    // Death Bringer masterclass. Each upgrade costs one bone type: OLA[330 + GrimoireUpg[i][3]]; levels in Grimoire[i].
    // Rows 52-54 are "Ripped_Page" placeholders. Unlocks follow the total of all levels (GrimoireUpg[i][6]).
    grimoire: {
        rows: () => cList.GrimoireUpg.slice(0, 52),
        currencies: ["femur", "ribcage", "cranium", "bovinae"],
        currencyOf: (row) => Number(row[3]),
        money: (currency) => ola()[330 + currency],
        level: (i) => gga.Grimoire[i],
        cost: (i) => summoning("GrimoireUpgCost", i, 0),
        unlockAt: (i, row) => Number(row[6]),
        isUnlocked: (i) => i < summoning("GrimoireUpgUNLOCKED", 0, 0),
        max: (row) => Number(row[4]),
        // The game has no Grimoire buy event; its menu click buys inline. These are that click's steps.
        buy: (i) => {
            const bones = 330 + Number(cList.GrimoireUpg[i][3]);
            const cost = summoning("GrimoireUpgCost", i, 0);
            if (!(ola()[bones] >= cost)) return;
            ola()[bones] -= cost;
            gga.Grimoire[i] = Math.round(gga.Grimoire[i] + 1);
            ola()[480] += 1;
            if (ola()[bones] < 0.1) ola()[bones] = 0.1;
            delete gga.DNSM.h.GrimoireTotLV;
        },
        waiting: () => null,
    },
    // W6 Sneaking, Ninja Knowledge. Ninja[102][1] jade, Ninja[103][i] levels, no max. NinjaUpg row 9 is a placeholder.
    sneaking: {
        rows: () => cList.NinjaUpg,
        skip: (i) => i === 9,
        name: (row) => row[4],
        money: () => gga.Ninja[102][1],
        level: (i) => gga.Ninja[103][i],
        cost: (i) => ninja("JadeUpgCost", i, 0),
        // Rows 0-16 need their parent (NinjaUpg[i][9], patched at load by mastery; row 0 is its own parent until then).
        // Later rows need a Coral Reef level.
        unlockAt: (i, row) =>
            i < 17 ? { parent: Number(row[9]) === i ? null : cList.NinjaUpg[row[9]][4] } : { reef: i - 16 },
        // Spelunk[13][3] is the W7 Coral Reef upgrade that adds these "mini" Knowledge rows.
        isUnlocked: (i) =>
            i < 17 ? i === 13 || gga.Ninja[103][cList.NinjaUpg[i][9]] >= 1 : gga.Spelunk[13][3] > i - 17,
        // The Knowledge panel's own text: { is the bonus, } the multiplier, # dropped (Menagerie omni levels count on 0-16).
        bonus: (i, row) => {
            const notate = events(124)._customBlock_NotateNumber;
            const value = (gga.Ninja[103][i] + (i < 17 ? gga.Menagerie[7][i] : 0)) * row[5];
            return String(row[6])
                .split("{")
                .join(notate(value, "Big"))
                .split("}")
                .join(notate(1 + value / 100, "MultiplierInfo"))
                .split("#")
                .join("");
        },
        // No buy event either; these are the Knowledge menu click's steps, minus its "i" tree redraw (draws art).
        buy: (i) => {
            const cost = ninja("JadeUpgCost", i, 0);
            if (!(gga.Ninja[102][1] >= cost)) return;
            gga.Ninja[102][1] -= cost;
            gga.Ninja[103][i] = Math.round(gga.Ninja[103][i] + 1);
            const talents = gga.DNSM.h.CalcTalentMAP;
            talents.h[430] = (Number(talents.h[430]) || 0) + 1;
            if (i === 16) gga.Ninja[102][8] = ninja("NLbonuses", 16, 0);
            if (i === 14 && gga.QuestComplete.h.Lafu_Shi3 === 0) gga.QuestStatus.h.Lafu_Shi3[1] = 1;
        },
        waiting: () => null,
    },
    // W6 Summoning upgrade board. Summon[2][colour] essence, Summon[0][i] levels, SummonUPG[i][8] max (9999 = none).
    summoning: {
        rows: () => cList.SummonUPG,
        name: (row) => row[3],
        currencies: ESSENCES.map((colour) => `${colour} essence`),
        currencyOf: (row) => Number(row[2]),
        money: (colour) => gga.Summon[2][colour],
        level: (i) => gga.Summon[0][i],
        cost: (i) => summoning("UpgCost", i, 0),
        // The board shows a row once its parent (SummonUPG[i][9]) has a level; Muddah (71) is its own parent and
        // shows with Spelunking's lore flag 4 instead. Row 0 has no parent.
        unlockAt: (i, row) => (i === 71 ? { lore: true } : { parent: cList.SummonUPG[row[9]]?.[3] ?? null }),
        isUnlocked: (i) => {
            const parent = Number(cList.SummonUPG[i][9]);
            return (
                parent === -1 ||
                gga.Summon[0][parent] >= 1 ||
                (i === 71 && events(579)._customBlock_Spelunk("DoWeHaveLoreN1", 4, 0) === 1)
            );
        },
        max: (row) => Number(row[8]),
        // The board's own text: { the bonus, > its multiplier, | the familiar cost reset, } a per-row total, @ a line break.
        bonus: (i, row) => {
            const comma = events(189)._customBlock_CommaNotation;
            const value = summoning("SummUpgBonus", i, 0);
            const boardLevel = Math.max(0, board()._GenINFO[170]);
            const shrink = (x) => Math.round(1e4 * (1 - 1 / (1 + x / 100))) / 100;
            const victories = SUMMON_VICTORY_ROWS.indexOf(i);
            let total = null;
            if (victories >= 0) total = comma(value * summoning("SummVictories", victories, 0));
            else if (SUMMON_LEVEL_ROWS.includes(i)) total = comma(value * gga.Lv0[18]);
            else if (i === 49 || i === 57 || i === 72) total = shrink(value);
            else if (i === 60 || i === 61) total = comma(Math.round(value * boardLevel));
            else if (i === 62 || i === 63 || i === 64) total = comma(Math.round(value * ola()[319]));
            else if (i === 68) total = comma(summoning("UnitDMG", -1, 0) * (value / 100));
            else if (i === 75) total = shrink(value * boardLevel);
            const restock = events(266)._customBlock_timeDisp2(gga.TimeAway.h.ShopRestock + 86400 * gga.Summon[3][3]);
            const text = String(row[11])
                .split("{")
                .join(comma(value))
                .split(">")
                .join(String(Math.round(100 + value) / 100))
                .split("|")
                .join(restock)
                .split("@")
                .join("");
            return total === null ? text : text.split("}").join(String(total));
        },
        note: (i) => {
            if (i !== 2) return null;
            const owned = FAMILIARS.flatMap((name, tier) =>
                gga.Summon[4][tier] > 0 ? `${gga.Summon[4][tier]} ${name}` : []
            );
            return owned.length ? `Familiars: ${owned.join(", ")}` : "No familiars yet";
        },
        // No buy event: the board's click buys inline. These are its steps, minus the art it draws
        // ("ehz" on a first level, "v" familiar sprites) and the FREE_FAMILIAR! popup.
        buy: (i) => {
            const row = cList.SummonUPG[i];
            const colour = Number(row[2]);
            const cost = summoning("UpgCost", i, 0);
            if (!(gga.Summon[2][colour] >= cost && gga.Summon[0][i] < Number(row[8]))) return;
            gga.Summon[2][colour] -= cost;
            gga.Summon[0][i] = Math.round(gga.Summon[0][i] + 1);
            if (gga.QuestComplete.h.Lafu_Shi6 === 0)
                gga.QuestStatus.h.Lafu_Shi6[0] = Number(gga.QuestStatus.h.Lafu_Shi6[0]) + 1;
            if (i === 2) summonFamiliar();
            const total = gga.Summon[0].reduce((sum, level) => sum + Number(level), 0);
            gga.DNSM.h.CalcTalentMAP.h[595] = total;
            board()._GenINFO[170] = Math.floor(total / 100);
        },
        waiting: () => (gga.MenuType2 === 60 ? "Paused while the summoning board is open" : null),
    },
    // W4 kitchen upgrades. Row 3k + slot is kitchen k's Speed, Fire or Luck: level Cooking[k][6 + slot], paid with
    // spice Meals[3][2k + slot] (CookingUpgSpiceCostType), so neighbouring kitchens share a spice. No max level.
    kitchens: {
        rows: () => gga.Cooking.flatMap((_, k) => KITCHEN_SLOTS.map((name, slot) => [name, k, slot])),
        // Every spice a kitchen upgrade can cost, up to 2k + 2 for the last kitchen's Luck. The game only draws
        // spice icons, so they are numbered here.
        get currencies() {
            return Array.from({ length: 2 * gga.Cooking.length + 1 }, (_, n) => `spice ${n}`);
        },
        currencyOf: ([, k, slot]) => cooking("CookingUpgSpiceCostType", k, slot),
        money: (spice) => gga.Meals[3][spice],
        level: (i) => gga.Cooking[Math.floor(i / 3)][6 + (i % 3)],
        cost: (i) => cooking("CookingUpgSpiceCostQty", Math.floor(i / 3), i % 3),
        unlockAt: () => null,
        // Cooking[k][0] is 0 until the kitchen is bought with coins.
        isUnlocked: (i) => Number(gga.Cooking[Math.floor(i / 3)][0]) !== 0,
        // The kitchen panel's own numbers.
        bonus: (i, [, k, slot]) => {
            if (slot === 2) return `${Math.round(100 * cooking("CookingLUCK", k, 0)) / 100}x`;
            const value = cooking(slot === 0 ? "CookingSPEED" : "CookingFIRE", k, 0);
            return `${events(124)._customBlock_NotateNumber(value, "Big")}/hr`;
        },
        // The upgrade click buys inline (Cooking2 "q", mouse-gated). These are its steps, minus the level bar art.
        buy: (i) => {
            const k = Math.floor(i / 3);
            const slot = i % 3;
            const spice = cooking("CookingUpgSpiceCostType", k, slot);
            const cost = cooking("CookingUpgSpiceCostQty", k, slot);
            if (!(gga.Meals[3][spice] >= cost)) return;
            gga.Meals[3][spice] -= cost;
            gga.Cooking[k][6 + slot] = Math.round(gga.Cooking[k][6 + slot] + 1);
            if (gga.Cooking[k][6 + slot] >= 300) events(345)._customBlock_Reg_ach_add_status(226, 10);
        },
        waiting: () => null,
    },
};

export const CLICKER_KEYS = Object.keys(CLICKERS);

function unlocked(clicker, i, row) {
    if (clicker.isUnlocked) return clicker.isUnlocked(i);
    return clicker.progress() >= clicker.unlockAt(i, row);
}

// Groups with several currencies (Grimoire bones) save and buy per currency; the others have one.
const currencyCount = (clicker) => clicker.currencies?.length ?? 1;

function buyableUpgrades(key, currency) {
    const clicker = CLICKERS[key];
    const settings = settingsById(cheatConfig.automation[key].items);
    return clicker.rows().flatMap((row, i) => {
        if (clicker.skip?.(i) || (clicker.currencyOf && clicker.currencyOf(row) !== currency)) return [];
        const entry = settings.get(String(i));
        const level = clicker.level(i);
        if (!entry?.on || !unlocked(clicker, i, row) || level >= (entry.stopAt ?? Infinity)) return [];
        if (level >= (clicker.max?.(row) ?? Infinity) || clicker.canBuy?.(i) === false) return [];
        return [{ id: i, cost: clicker.cost(i), priority: entry.priority, buy: () => clicker.buy(i) }];
    });
}

/** One clicker's currencies, upgrades and current goals for the Account > Automation tab. */
export function getAutomationClicker(key) {
    const clicker = CLICKERS[key];
    const waiting = clicker.waiting();
    return {
        rate: clicker.rate?.() ?? null,
        waiting,
        currencies: Array.from({ length: currencyCount(clicker) }, (_, currency) => {
            const goal = waiting ? null : nextGoal(buyableUpgrades(key, currency));
            return {
                name: clicker.currencies?.[currency] ?? null,
                money: clicker.money(currency),
                goal: goal && { id: goal.id, cost: goal.cost },
            };
        }),
        upgrades: clicker
            .rows()
            .map((row, i) => ({
                id: i,
                name: clicker.name?.(row) ?? row[0],
                bonus: clicker.bonus?.(i, row) ?? null,
                note: clicker.note?.(i) ?? null,
                currency: clicker.currencyOf ? clicker.currencies[clicker.currencyOf(row)] : null,
                level: clicker.level(i),
                cost: clicker.cost(i),
                unlockAt: clicker.unlockAt(i, row),
                unlocked: unlocked(clicker, i, row),
                maxed: clicker.level(i) >= (clicker.max?.(row) ?? Infinity),
            }))
            .filter(({ id }) => !clicker.skip?.(id)),
    };
}

export function runClickers() {
    for (const key of CLICKER_KEYS) {
        const clicker = CLICKERS[key];
        if (!cheatConfig.automation[key].items.some((entry) => entry.on) || clicker.waiting()) continue;
        // Summoning keeps one saving % per essence colour; the others share one.
        const { saving } = cheatConfig.automation[key];
        for (let currency = 0; currency < currencyCount(clicker); currency++) {
            buyCheapestFirst(
                () => buyableUpgrades(key, currency),
                () => clicker.money(currency),
                Array.isArray(saving) ? saving[currency] : saving
            );
        }
    }
}
