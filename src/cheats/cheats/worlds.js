/**
 * Worlds Cheats
 *
 * World-specific cheats organized by world (W1-W7):
 * - W1: anvil, forge, stampcost, smith, companion, owl
 * - W2: boss, roo, alchemy, vialrng, vialattempt, sigilspeed
 * - W3: construction, worship, trapping, cogs, etc.
 * - W4: breeding, cooking, lab, etc.
 * - W5: sailing, gaming, divinity, holes
 * - W6: farming, ninja, summoning, etc.
 * - W7: spelunk, gallery, reef, clam, etc.
 */

import { registerCheat, registerCheats } from "../core/registration.js";
import { events } from "../core/globals.js";
import { summonUnits, keychainStatsMap } from "../constants.js";
import { cheatConfig } from "../core/state.js";

/**
 * Helper to create configurable object cheat definition.
 * @param {string} name - Cheat name
 * @param {string} msg - Description message (appended with "check config file")
 * @returns {object} Cheat definition
 */
const configCheat = (name, msg) => ({
    name,
    message: `${msg} check config file`,
    configurable: { isObject: true },
});

// World 1 cheats
registerCheats({
    name: "w1",
    message: "all w1 cheats.",
    canToggleSubcheats: true,
    subcheats: [
        { name: "anvil", message: "anvil cost and duration nullification." },
        { name: "forge", message: "forge speed and capacity multiplier check config" },
        { name: "stampcost", message: "stamp cost reduction multiplier check config" },
        {
            name: "smith",
            message: "smithing cost nullification (change maps to have the effect apply).",
        },
        { name: "companion", message: "companions cheat", configurable: true },
        { name: "owl", message: "owl cheats, check config file", configurable: true },
    ],
});

// World 2 cheats
registerCheats({
    name: "w2",
    message: "World 2 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "boss", message: "unlimited boss attempts" },
        { name: "roo", message: "roo cheats, check config file", configurable: true },
        { name: "alchemy", message: "alchemy cheats, check config file", configurable: true },
        { name: "vialrng", message: "vial unlock upon rolling 1+" },
        { name: "vialattempt", message: "unlimited vial attempts" },
        { name: "sigilspeed", message: "fast sigil research (see config)" },
    ],
});

// World 3 cheats
registerCheats({
    name: "w3",
    message: "all workbench nullifications and worship mob insta-death.",
    canToggleSubcheats: true,
    subcheats: [
        { name: "mobdeath", message: "worship mobs insta-death." },
        { name: "towerdamage", message: "multiply tower damage (see config)" },
        { name: "flagreq", message: "flag unlock time nullification." },
        { name: "freebuildings", message: "free tower upgrades." },
        { name: "instabuild", message: "insta-build of buildings." },
        { name: "booktime", message: "book per second." },
        { name: "totalflags", message: "10 total flags." },
        { name: "buildspd", message: "multiply build speed (see config)" },
        { name: "saltlick", message: "Salt Lick upgrade cost nullification." },
        { name: "refinery", message: "refinery cost nullification." },
        { name: "refineryspeed", message: "reduces refinery time (see config)" },
        { name: "trapping", message: "multiply trapping time, make the traps faster by adding more time" },
        { name: "book", message: "always max lvl talent book." },
        { name: "prayer", message: "Prayer curse nullification." },
        { name: "worshipspeed", message: "multiply worship charge speed (see config)" },
        { name: "freeworship", message: "nullification of worship charge cost" },
        { name: "globalshrines", message: "global shrines" },
        { name: "instantdreams", message: "Dream bar fills instantly" },
        { name: "bettercog", message: "Gives you a bit better cog chances" },
        { name: "jeweledcogs", message: "Unlimited jeweled cogs (needs to be unlocked in gaming first)" },
    ],
});

// World 4 cheats
registerCheats({
    name: "w4",
    message: "all w4 cheats.",
    canToggleSubcheats: true,
    subcheats: [
        { name: "battleslots", message: "all 6 battle slots" },
        { name: "eggcap", message: "all egg slots" },
        { name: "fenceyard", message: "all fenceyard slots" },
        { name: "petchance", message: "configurable pet chance (see config)" },
        { name: "genes", message: "0 gene upgrades" },
        { name: "fasteggs", message: "faster incubation (see config)" },
        { name: "fastforaging", message: "fast foraging (see config)" },
        { name: "spiceclaim", message: "unlimited spice claims" },
        { name: "petupgrades", message: "cheaper pet upgrades (see config)" },
        {
            name: "petrng",
            message: "max strength pets (for level and egg, with a tiny bit of randomness)",
        },
        {
            name: "superpets",
            message: "don't mess with these little guys, even if they look cute",
        },
        { name: "labpx", message: "long lab connections" },
        { name: "mealspeed", message: "configurable meal speed (see config)" },
        { name: "recipespeed", message: "configurable recipe speed (see config)" },
        { name: "luckychef", message: "new recipe chance (see config)" },
        { name: "kitchensdiscount", message: "cheaper kitchens and upgrades (see config)" },
        { name: "platesdiscount", message: "cheaper dinner plate upgrades (see config)" },
        { name: "arena", message: "unlimited arena entries" },
        configCheat("mainframe", "mainframe cheats"),
        configCheat("chipbonuses", "chip bonuses"),
        configCheat("meals", "meal bonus cheats"),
    ],
});

// World 5 cheats
registerCheats({
    name: "w5",
    message: "all w5 cheats",
    canToggleSubcheats: true,
    subcheats: [
        configCheat("sailing", "sailing cheats"),
        { name: "endercaptains", message: "100% ender captains (requires Emporium bonus unlock)" },
        configCheat("gaming", "gaming cheats"),
        configCheat("divinity", "divinity cheats"),
        configCheat("collider", "collider cheats"),
        configCheat("holes", "holes cheats"),
    ],
});

// World 6 cheats
registerCheats({
    name: "w6",
    message: "all available w6 cheats",
    canToggleSubcheats: true,
    subcheats: [
        configCheat("farming", "farming cheats"),
        configCheat("ninja", "ninja cheats"),
        configCheat("summoning", "summoning cheats"),
        configCheat("grimoire", "grimoire cheats"),
        configCheat("windwalker", "windwalker cheats"),
        configCheat("arcane", "arcane cultist cheats"),
        configCheat("emperor", "unlimeted emperor tries"),
        configCheat("endless", "easy endless runs for summoning"),
        configCheat("sneaksymbol", "sneaksymbol 100% chance"),
        {
            name: "ninjaItem",
            message: "Generates a ninja item based on the floor which ninja twin is inputted.",
            fn: function (params) {
                if (params && params[1]) {
                    const char = parseInt(params[1]);
                    let loopTimes = 1;

                    // TODO: make this dynamic with character count
                    if (char < 0 || char > 9)
                        return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
                    try {
                        loopTimes = params[2] && parseInt(params[2]) > 0 ? parseInt(params[2]) : 1;
                        const actorEvents579 = events(579);
                        let n = 0;
                        while (n < loopTimes) {
                            actorEvents579._customBlock_Ninja("GenerateItem", char, 0);
                            n++;
                        }
                        return `Generated ${loopTimes} ninja items for character ${char}`;
                    } catch (err) {
                        return `Error: ${err}`;
                    }
                }
                return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
            },
        },
        {
            name: "sumunit",
            message: "Set summoning units to be always a certain type",
            fn: function (params) {
                if (params && params[1]) {
                    try {
                        if (params[1] === "reset") {
                            cheatConfig.w6.summoning.UnitTypeDraw = (t) => t;
                            return `summoning units has been reset to default`;
                        }

                        const summonUnit = summonUnits[params[1]];
                        if (summonUnit || summonUnit === 0) {
                            cheatConfig.w6.summoning.UnitTypeDraw = () => summonUnit;
                            return `${params[1]} set as unit to be drawn`;
                        }
                        return `no such unit ${params[1]} found`;
                    } catch (err) {
                        return `Error: ${err}`;
                    }
                }
                return `Please input a unit name 'basic' 'vrumbi' 'bloomy' 'tonka' 'regalis' 'sparkie' 'guardio' 'muddah' OR 'reset' to summon as per normal.`;
            },
        },
    ],
});

// World 7 cheats
registerCheats({
    name: "w7",
    message: "all available w7 cheats",
    canToggleSubcheats: true,
    subcheats: [
        configCheat("spelunk", "spelunk cheats"),
        configCheat("gallery", "gallery cheats"),
        configCheat("reef", "coral reef nullify cost"),
        configCheat("clam", "clam cheats"),
        configCheat("coralkid", "coral kid nullify cost"),
        configCheat("bigfish", "big fish nullify cost"),
        configCheat("bubba", "bubba cheats"),
        configCheat("zenith", "zenith market cheats"),
    ],
});

// Keychain cheat (W7 Flurbo store)
registerCheat({
    name: "keychain",
    message: "Generate specific keychain with double max stats when buying from Flurbo store",
    fn: (params) => {
        if (params && params[0]) {
            try {
                const selectedStat = keychainStatsMap[params[0]];

                if (selectedStat) {
                    cheatConfig.misc.keychain = () => [
                        selectedStat[1],
                        selectedStat[2],
                        parseInt(selectedStat[3]),
                        selectedStat[2],
                        parseInt(selectedStat[3]),
                    ];
                }
                return `Set keychain with ${selectedStat[2]}`;
            } catch (err) {
                return `Error: ${err}`;
            }
        }
        cheatConfig.misc.keychain = (t) => t;
        return `Reset to default rng, input a stat to set keychain stats`;
    },
});
