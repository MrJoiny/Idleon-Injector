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

import { registerCheats } from "../core/registration.js";
import { events } from "../core/globals.js";
import { summonUnits } from "../constants.js";
import { cheatConfig } from "../core/state.js";

registerCheats({
    name: "w1",
    message: "World 1 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "anvil", message: "anvil cost and duration nullification." },
        { name: "forge", message: "forge speed and capacity multiplier check config" },
        { name: "stampcost", message: "stamp cost reduction multiplier check config" },
        { name: "smith", message: "smithing cost nullification (change maps to apply)." },
        { name: "companion", message: "companions cheat" },
        { name: "owl", message: "owl cheats, check config file" },
    ],
});

registerCheats({
    name: "w2",
    message: "World 2 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "boss", message: "unlimited boss attempts" },
        { name: "roo", message: "roo cheats, check config file" },
        { name: "alchemy", message: "alchemy cheats, check config file" },
        { name: "vialrng", message: "vial unlock upon rolling 1+" },
        { name: "vialattempt", message: "unlimited vial attempts" },
        { name: "sigilspeed", message: "fast sigil research (see config)" },
    ],
});

registerCheats({
    name: "w3",
    message: "World 3 cheats",
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

registerCheats({
    name: "w4",
    message: "World 4 cheats",
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
        { name: "petrng", message: "max strength pets for level and egg, with a bit of randomness" },
        { name: "superpets", message: "don't mess with these little guys, even if they look cute" },
        { name: "labpx", message: "long lab connections" },
        { name: "mealspeed", message: "configurable meal speed (see config)" },
        { name: "recipespeed", message: "configurable recipe speed (see config)" },
        { name: "luckychef", message: "new recipe chance (see config)" },
        { name: "kitchensdiscount", message: "cheaper kitchens and upgrades (see config)" },
        { name: "platesdiscount", message: "cheaper dinner plate upgrades (see config)" },
        { name: "arena", message: "unlimited arena entries" },
        { name: "mainframe", message: "mainframe cheats" },
        { name: "chipbonuses", message: "chip bonuses" },
        { name: "meals", message: "meal bonus cheats" },
    ],
});

registerCheats({
    name: "w5",
    message: "World 5 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "sailing", message: "sailing cheats" },
        { name: "endercaptains", message: "100% ender captains (requires Emporium bonus unlock)" },
        { name: "gaming", message: "gaming cheats" },
        { name: "divinity", message: "divinity cheats" },
        { name: "collider", message: "collider cheats" },
        { name: "holes", message: "holes cheats" },
    ],
});

registerCheats({
    name: "w6",
    message: "World 6 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "farming", message: "farming cheats" },
        { name: "ninja", message: "ninja cheats" },
        { name: "summoning", message: "summoning cheats" },
        { name: "grimoire", message: "grimoire cheats" },
        { name: "windwalker", message: "windwalker cheats" },
        { name: "arcane", message: "arcane cultist cheats" },
        { name: "emperor", message: "unlimeted emperor tries" },
        { name: "endless", message: "easy endless runs for summoning" },
        { name: "sneaksymbol", message: "sneaksymbol 100% chance" },
        {
            name: "ninjaItem",
            message: "Generates a ninja item based on the floor which ninja twin is inputted.",
            fn: function (params) {
                const char = parseInt(params?.[1]);
                if (isNaN(char) || char < 0 || char > 9) {
                    // TODO: make this dynamic with character count
                    return `Please choose a ninja twin to generate item, 0 -> first char, 1 -> second char.`;
                }

                const loopTimes = Math.max(1, parseInt(params[2]) || 1);
                const actorEvents579 = events(579);
                for (let n = 0; n < loopTimes; n++) {
                    actorEvents579._customBlock_Ninja("GenerateItem", char, 0);
                }
                return `Generated ${loopTimes} ninja items for character ${char}`;
            },
        },
        {
            name: "sumunit",
            message: "Set summoning units to be always a certain type",
            fn: function (params) {
                const unitName = params?.[1];
                if (!unitName) {
                    return `Please input a unit name ${[...summonUnits.keys()].join(", ")} to summon as per normal.`;
                }

                if (unitName === "reset") {
                    cheatConfig.w6.summoning.UnitTypeDraw = (t) => t;
                    return `summoning units has been reset to default`;
                }

                const summonUnit = summonUnits[unitName];
                if (summonUnit === undefined) {
                    return `no such unit ${unitName} found`;
                }

                cheatConfig.w6.summoning.UnitTypeDraw = () => summonUnit;
                return `${unitName} set as unit to be drawn`;
            },
        },
    ],
});

registerCheats({
    name: "w7",
    message: "World 7 cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "spelunk", message: "spelunk cheats" },
        { name: "gallery", message: "gallery cheats" },
        { name: "reef", message: "coral reef nullify cost" },
        { name: "clam", message: "clam cheats" },
        { name: "coralkid", message: "coral kid nullify cost" },
        { name: "bigfish", message: "big fish nullify cost" },
        { name: "bubba", message: "bubba cheats" },
        { name: "zenith", message: "zenith market cheats" },
    ],
});
