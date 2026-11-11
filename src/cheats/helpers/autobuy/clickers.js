import { behavior, cList, events, gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { buyCheapestFirst, nextGoal, settingsById } from "./engine.js";

const ola = () => gga.OptionsListAccount;
const summoning = (...args) => events(579)._customBlock_Summoning(...args);
const bubbastuff = (...args) => events(579)._customBlock_Bubbastuff(...args);
// The clickers' own buy events: Orion and Poppy share the owl behavior, Bubba has his own.
const owl = () => gga.PixelHelperActor[25].behaviors.getBehavior("ActorEvents_670");
const seal = () => gga.PixelHelperActor[26].behaviors.getBehavior("ActorEvents_713");
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
};

export const CLICKER_KEYS = Object.keys(CLICKERS);

function unlocked(clicker, i, row) {
    if (clicker.isUnlocked) return clicker.isUnlocked(i);
    return clicker.progress() >= clicker.unlockAt(i, row);
}

function buyableUpgrades(key) {
    const clicker = CLICKERS[key];
    const settings = settingsById(cheatConfig.autobuy[key].items);
    return clicker.rows().flatMap((row, i) => {
        const entry = settings.get(String(i));
        const level = clicker.level(i);
        if (!entry?.on || !unlocked(clicker, i, row) || level >= (entry.stopAt ?? Infinity)) return [];
        if (level >= (clicker.max?.(row) ?? Infinity) || clicker.canBuy?.(i) === false) return [];
        return [{ id: i, cost: clicker.cost(i), priority: entry.priority, buy: () => clicker.buy(i) }];
    });
}

/** One clicker's currency, upgrades and current goal for the Account > Autobuy > Clickers tab. */
export function getAutobuyClicker(key) {
    const clicker = CLICKERS[key];
    const waiting = clicker.waiting();
    const goal = waiting ? null : nextGoal(buyableUpgrades(key));
    return {
        money: clicker.money(),
        rate: clicker.rate?.() ?? null,
        waiting,
        goal: goal && { id: goal.id, cost: goal.cost },
        upgrades: clicker.rows().map((row, i) => ({
            id: i,
            name: row[0],
            level: clicker.level(i),
            cost: clicker.cost(i),
            unlockAt: clicker.unlockAt(i, row),
            unlocked: unlocked(clicker, i, row),
            maxed: clicker.level(i) >= (clicker.max?.(row) ?? Infinity),
        })),
    };
}

export function runClickers() {
    for (const key of CLICKER_KEYS) {
        const clicker = CLICKERS[key];
        if (!cheatConfig.autobuy[key].items.some((entry) => entry.on) || clicker.waiting()) continue;
        buyCheapestFirst(() => buyableUpgrades(key), clicker.money, cheatConfig.autobuy[key].saving);
    }
}
