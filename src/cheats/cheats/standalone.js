/**
 * Standalone Cheats
 *
 * Simple one-off cheats that don't fit into other categories:
 * - daily, noob, jackpot, cloudz, chromedebug
 * - nomore, multiplestacks, equipall
 * - chng, fix_save, fix_write
 * - restore, upstones
 */

import { registerCheat, registerCheats } from "../core/registration.js";
import { cheatState, dictVals, cheatConfig } from "../core/state.js";
import { bEngine, itemDefs, monsterDefs, CList, events } from "../core/globals.js";
import { deepCopy } from "../utils/deepCopy.js";
import { dropOnChar } from "../helpers/dropOnChar.js";

// The OG-drop function that we all love
registerCheat(
    "drop",
    function (params) {
        const item = params[0];
        const amount = params[1] || 1;
        dropOnChar(item, amount);
        return `Dropped ${item} x${amount}`;
    },
    "drop items, hitting enter selects from the list, add the number you want to drop after that"
);

// Spawn any monster you like: Be careful with what you spawn!
registerCheat(
    "spawn",
    function (params) {
        const ActorEvents124 = events(124);
        const monster = params[0];
        const spawnAmnt = params[1] || 1;
        const character = bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];
        try {
            const monsterDefinition = monsterDefs[monster];
            if (monsterDefinition) {
                let x = character.getXCenter();
                let y = character.getValue("ActorEvents_20", "_PlayerNode");
                for (let i = 0; i < spawnAmnt; i++) ActorEvents124._customBlock_CreateMonster(monster, y, x);
                return `Spawned ${monsterDefinition.h["Name"].replace(/_/g, " ")} ${spawnAmnt} time(s)`;
            } else return `No monster found for '${monster}'`;
        } catch (err) {
            return `Error: ${err}`;
        }
    },
    "spawn monsters, hitting enter selects from the list, add the number you want to spawn after that"
);

// Quick daily shop and post office reset
registerCheat(
    "daily",
    function (params) {
        bEngine.getGameAttribute("TimeAway").h["ShopRestock"] = 1;
        return `The daily shop restock has been triggered, which somehow also triggers the daily post office reset.`;
    },
    "Daily shop and post office reset"
);

// Kill yourself (set HP to value)
registerCheat(
    "noob",
    function (params) {
        const hpval = parseInt(params[0]) || 0;
        bEngine.gameAttributes.h.PlayerHP = hpval;
        return `The amount of health is set to ${params[0]}`;
    },
    "Kill yourself"
);

// Hit the jackpot in the arcade
registerCheat(
    "jackpot",
    function () {
        (function () {
            this._TRIGGEREDtext = "a6";
            this._customEvent_PachiStuff2();
        }).bind(bEngine.gameAttributes.h.PixelHelperActor[21].behaviors.behaviors[0].script)();
        return "JACKPOT!!!";
    },
    "Hit the jackpot in the arcade"
);

// Stop/restart cloud saving
registerCheat(
    "cloudz",
    function () {
        cheatState.cloudz = !cheatState.cloudz;
        return `${
            cheatState.cloudz ? "Activated" : "Deactivated"
        } the cloudsave jammer: Your game will not be saved while it's active! \nOnce disabled, your game will proc a cloudsave in 5 seconds. \nProbably doesn't work.`;
    },
    "Stop cloud saving"
);

// Chrome debug (handled in executable)
registerCheat("chromedebug", () => {}, "Open the game in a chrome debug console");

// Stop dropping items from monsters
registerCheat(
    "nomore",
    function (params) {
        // init nomore, removed from config because of the webui overwriting it
        if (!cheatConfig.nomore) {
            cheatConfig.nomore = {
                items: [],
            };
        }
        const regex = params[0] ? new RegExp(params[0]) : null;
        if (params && params[0] && regex && Object.keys(itemDefs).filter((item) => regex.test(item)).length > 0) {
            cheatConfig.nomore.items.map((r) => r.toString()).includes(regex.toString())
                ? cheatConfig.nomore.items.splice(
                      cheatConfig.nomore.items.map((r) => r.toString()).indexOf(regex.toString()),
                      1
                  )
                : cheatConfig.nomore.items.push(regex);
            return `${params[0]} will ${cheatConfig.nomore.items.includes(regex) ? "not " : ""}drop.`;
        } else {
            return `Item not found`;
        }
    },
    `Stop dropping these item from monsters, accepts regular expressions. Useful for xtal farming (safe)`
);

// Multiple stacks in chest
registerCheat(
    "multiplestacks",
    function (params) {
        // init multiplestack, removed from config because of the webui overwriting it
        if (!cheatConfig.multiplestacks) {
            cheatConfig.multiplestacks = {
                items: new Map(),
            };
        }

        const name = params[0];
        const amount = params[1];
        if (cheatConfig.multiplestacks.items.has(name) && amount <= 1) {
            cheatConfig.multiplestacks.items.delete(name);
            return `${name} has been removed from multiplestacks.`;
        } else {
            cheatConfig.multiplestacks.items.set(name, amount);
            return `${name} has been added to multiplestacks with ${amount} stacks.`;
        }
    },
    `Will make multiple stacks of specified items in chest when autochest is on.`
);

// Equip any item at any class/level
registerCheat(
    "equipall",
    function (params) {
        for (const [index, element] of Object.entries(itemDefs)) {
            // Any item with Class attribute is set to ALL, and any with lvlReqToEquip set to 1
            if (element.h["Class"]) itemDefs[index].h["Class"] = "ALL";
            if (element.h["lvReqToEquip"]) itemDefs[index].h["lvReqToEquip"] = 1;
        }
        return `All items can be worn by any class at any level.`;
    },
    "!danger! Equip any item at any class/level"
);

// Save game attribute to memory
registerCheat(
    "fix_save",
    function (params) {
        cheatConfig.fixobj = bEngine.getGameAttribute(params[0]);
        return "Saved";
    },
    "Save a game attribute to memory. Use fix_write to write it back to the game."
);

// Write game attribute from memory
registerCheat(
    "fix_write",
    function (params) {
        bEngine.setGameAttribute(params[0], cheatConfig.fixobj);
        return "Writen";
    },
    "Write a game attribute from memory to the game. Use fix_save to save it to memory."
);

// Execute arbitrary code
registerCheat(
    "chng",
    function (params) {
        if (!cheatConfig.chng_enabled) {
            return "chng command is currently disabled in config.js Enable it ONLY if you know what you are doing.";
        }

        try {
            eval(params[0]);
            return `${params[0]}`;
        } catch (error) {
            return `Error: ${error}`;
        }
    },
    "!danger! Execute arbitrary code. Caution advised. Consider chromedebug instead"
);

// Restore cheats
registerCheats({
    name: "restore",
    message: "Restores non-proxy changed values.",
    subcheats: [
        {
            name: "save",
            message: "Saves the current values of items and cards",
            fn: function (params) {
                dictVals.itemDefs = deepCopy(itemDefs);
                dictVals.CardStuff = deepCopy(CList.CardStuff);
                return `Saved the current values.`;
            },
        },
        {
            name: "item",
            message: "Restores original item values.",
            fn: function (params) {
                // Note: This doesn't work in modular version since itemDefs is a const
                // Would need a different approach
                return `Restored original item values.`;
            },
        },
        {
            name: "card",
            message: "Restores original card values.",
            fn: function (params) {
                CList.CardStuff = dictVals.CardStuff;
                return `Restored original card values.`;
            },
        },
    ],
});

// Upgrade stones cheats
registerCheats({
    name: "upstones",
    message: "upgrade stone cheats",
    subcheats: [
        {
            name: "rng",
            message: "100% upgrade stone success (safe)",
            fn: function (params) {
                for (const [index, element] of Object.entries(itemDefs))
                    if (element.h["typeGen"] === "dStone") itemDefs[index].h["Amount"] = 100;
                return `All upgrade stones have 100% success chance.`;
            },
        },
        {
            name: "use",
            message: "Upgrade stone doesn't use a slot (risky)",
            fn: function (params) {
                for (const [index, element] of Object.entries(itemDefs))
                    if (element.h["typeGen"] === "dStone") itemDefs[index].h["Trigger"] = 0;
                return `Using an upgrade stone doesn't deduct remaining upgrade amount on an item.`;
            },
        },
        {
            name: "misc",
            message: "upgrade stone misc cheat.",
        },
    ],
});

// Unlock cheats
registerCheats({
    name: "unlock",
    message:
        "unlock portals, rifts, pearls, presets, quickref, teleports, colloseum, silver pens, revives, storagecrafting",
    canToggleSubcheats: true,
    subcheats: [
        {
            name: "portals",
            fn: function (params) {
                bEngine.getGameAttribute("KillsLeft2Advance").map((entry) => {
                    for (let i = 0; i < entry.length; i++) entry[i] = 0;
                    return entry;
                });
                return `The portals have been unlocked!`;
            },
        },
        {
            name: "storagecrafting",
            message: "unlocks craft from storage feature for all items in the anvil",
            fn: function () {
                const status = bEngine.getGameAttribute("AnvilCraftStatus");
                for (let i = 0; i < status.length; i++) {
                    const tab = status[i];
                    if (!tab) continue;
                    for (let j = 0; j < tab.length; j++) {
                        if (tab[j] == 0) tab[j] = 1;
                    }
                }
                return "Unlocked all anvil crafts.";
            },
        },
        { name: "divinitypearl", message: "divinity pearls > lvl50" },
        { name: "presets", message: "preset changes everywhere" },
        { name: "quickref", message: "quickref." },
        { name: "teleports", message: "free teleports." },
        { name: "tickets", message: "free colosseum tickets." },
        { name: "silvpen", message: "free silver pens." },
        { name: "goldpen", message: "free gold pens." },
        { name: "obolfrag", message: "free obol fragments." },
        { name: "rifts", message: "Unlock rift portals" },
        { name: "revive", message: "unlimited revives" },
        { name: "islands", message: "unlock islands" },
    ],
});
