/**
 * Standalone Cheats
 *
 * Simple one-off cheats that don't fit into other categories:
 * - daily, noob, jackpot, cloudz, chromedebug
 * - nomore, multiplestacks
 * - fix_save, fix_write
 * - upstones, keychain, unlock
 */

import { registerCheat, registerCheats } from "../core/registration.js";
import { cheatState, cheatConfig } from "../core/state.js";
import { bEngine, itemDefs, monsterDefs, events } from "../core/globals.js";
import { deepCopy } from "../utils/deepCopy.js";
import { dropOnChar, getCharCords } from "../helpers/dropOnChar.js";
import { keychainStatsMap } from "../constants.js";

// The OG-drop function that we all love
registerCheat({
    name: "drop",
    message: "drop items",
    fn: (params) => {
        const item = params[0];
        const amount = params[1] || 1;
        dropOnChar(item, amount);
        return `Dropped ${item} x${amount}`;
    },
});

// Spawn any monster you like: Be careful with what you spawn!
registerCheat({
    name: "spawn",
    message: "spawn monsters",
    fn: (params) => {
        const ActorEvents124 = events(124);
        const monster = params[0];
        const spawnAmnt = params[1] || 1;

        const monsterDefinition = monsterDefs[monster];
        if (monsterDefinition) {
            const { x, y } = getCharCords();
            for (let i = 0; i < spawnAmnt; i++) {
                ActorEvents124._customBlock_CreateMonster(monster, y, x);
            }
            return `Spawned ${monsterDefinition.h.Name.replace(/_/g, " ")} ${spawnAmnt} time(s)`;
        } else return `No monster found for '${monster}'`;
    },
});

// Quick daily shop and post office reset
registerCheat({
    name: "daily",
    message: "Daily shop and post office reset",
    fn: () => {
        bEngine.getGameAttribute("TimeAway").h.ShopRestock = 1;
        return "The daily shop restock has been triggered.";
    },
});

// Kill yourself (set HP to value)
registerCheat({
    name: "noob",
    message: "Kill yourself",
    fn: (params) => {
        const hpval = parseInt(params[0]) || 0;
        bEngine.gameAttributes.h.PlayerHP = hpval;
        return `The amount of health is set to ${hpval}`;
    },
});

// Hit the jackpot in the arcade
registerCheat({
    name: "jackpot",
    message: "Hit the jackpot in the arcade",
    fn: () => {
        (function () {
            this._TRIGGEREDtext = "a6";
            this._customEvent_PachiStuff2();
        }).bind(bEngine.gameAttributes.h.PixelHelperActor[21].behaviors.behaviors[0].script)();
        return "JACKPOT!!!";
    },
});

// Stop/restart cloud saving
registerCheat({
    name: "cloudz",
    message: "Stops cloud saving",
    fn: () => {
        cheatState.cloudz = !cheatState.cloudz;
        return `${
            cheatState.cloudz ? "Activated" : "Deactivated"
        } the cloudsave jammer: Your game will not be saved while it's active! \nOnce disabled, your game will proc a cloudsave in 5 seconds.`;
    },
});

// Chrome debug (handled in executable)
registerCheat({
    name: "chromedebug",
    message: "Open the game in a chrome debug console",
    fn: () => {},
});

// Stop dropping items from monsters
registerCheat({
    name: "nomore",
    message: "Stop dropping items from monsters, accepts regex.",
    fn: (params) => {
        // Init nomore config if not exists
        if (!cheatConfig.nomore) {
            cheatConfig.nomore = { items: [] };
        }

        const pattern = params[0];
        if (!pattern) {
            return "Item not found";
        }

        const regex = new RegExp(pattern);
        const matchesAnyItem = Object.keys(itemDefs).some((item) => regex.test(item));
        if (!matchesAnyItem) {
            return "Item not found";
        }

        // Check if this pattern already exists (by string comparison)
        const regexStr = regex.toString();
        const existingIndex = cheatConfig.nomore.items.findIndex((r) => r.toString() === regexStr);

        if (existingIndex !== -1) {
            // Remove existing pattern
            cheatConfig.nomore.items.splice(existingIndex, 1);
            return `${pattern} will drop.`;
        } else {
            // Add new pattern
            cheatConfig.nomore.items.push(regex);
            return `${pattern} will not drop.`;
        }
    },
});

// Multiple stacks in chest
registerCheat({
    name: "multiplestacks",
    message: "Will make multiple stacks of specified items in chest when autochest is on.",
    fn: (params) => {
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
});

// Save game attribute to memory
registerCheat({
    name: "fix_save",
    message: "Save a game attribute to memory. Use fix_write to write it back to the game.",
    fn: (params) => {
        cheatConfig.fixobj = deepCopy(bEngine.getGameAttribute(params[0]));
        return "Saved";
    },
});

// Write game attribute from memory
registerCheat({
    name: "fix_write",
    message: "Write a game attribute from memory to the game. Use fix_save to save it to memory.",
    fn: (params) => {
        if (!params[0]) return "No attribute specified";
        if (!cheatConfig.fixobj) return "No attribute saved";
        bEngine.setGameAttribute(params[0], deepCopy(cheatConfig.fixobj));
        return "Written";
    },
});

// Upgrade stones cheats (now proxy-based - see proxies/items.js)
registerCheats({
    name: "upstones",
    message: "upgrade stone cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "rng", message: "100% upgrade stone success (safe)" },
        { name: "use", message: "Upgrade stones don't use a slot (risky)" },
        { name: "misc", message: "upgrade stone misc cheat." },
    ],
});

// Unlock cheats
registerCheats({
    name: "unlock",
    message:
        "unlock portals, rifts, pearls, presets, quickref, teleports, colloseum, silver pens, revives, storagecrafting",
    canToggleSubcheats: true,
    subcheats: [
        { name: "divinitypearl", message: "divinity pearls > lvl50" },
        { name: "presets", message: "preset changes everywhere" },
        { name: "quickref", message: "quickref." },
        { name: "teleports", message: "free teleports." },
        { name: "tickets", message: "free colosseum tickets." },
        { name: "silvpen", message: "free silver pens." },
        { name: "obolfrag", message: "free obol fragments." },
        { name: "rifts", message: "Unlock rift portals" },
        { name: "revive", message: "unlimited revives" },
        {
            name: "islands",
            message: "unlock fishing islands",
            fn: () => {
                bEngine.getGameAttribute("OptionsListAccount")[169] = cheatConfig.unlock.islands;
            },
        },
        {
            name: "portals",
            message: "Unlocks all portals",
            fn: () => {
                bEngine.getGameAttribute("KillsLeft2Advance").map((entry) => {
                    for (let i = 0; i < entry.length; i++) entry[i] = Math.min(entry[i], 0);
                    return entry;
                });
                return "The portals have been unlocked!";
            },
        },
        {
            name: "storagecrafting",
            message: "unlocks craft from storage feature for all items in the anvil",
            fn: () => {
                const status = bEngine.getGameAttribute("AnvilCraftStatus");
                for (let i = 0; i < status.length; i++) {
                    const tab = status[i];
                    if (!tab) continue;
                    for (let j = 0; j < tab.length; j++) {
                        if (tab[j] === 0) tab[j] = 1;
                    }
                }
                return "Unlocked all anvil crafts.";
            },
        },
    ],
});

// Keychain cheat
registerCheat({
    name: "keychain",
    message: "Generate specific keychain with double max stats when buying from Flurbo store",
    fn: (params) => {
        const statName = params?.[0];
        if (!statName) {
            cheatConfig.misc.keychain = (t) => t;
            return `Reset to default rng, input a stat to set keychain stats`;
        }

        const selectedStat = keychainStatsMap[statName];
        if (!selectedStat) {
            return `Unknown stat: ${statName}`;
        }

        cheatConfig.misc.keychain = () => [
            selectedStat[1],
            selectedStat[2],
            parseInt(selectedStat[3]),
            selectedStat[2],
            parseInt(selectedStat[3]),
        ];
        return `Set keychain with ${selectedStat[2]}`;
    },
});
