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
import { cList, events, gga } from "../core/globals.js";
import { summonUnits } from "../constants.js";
import { cheatConfig, cheatState } from "../core/state.js";

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
        {
            name: "killroyreset",
            message: "reset killroy weekly progress",
            fn: () => {
                gga.OptionsListAccount[113] = 0;
                return "Killroy weekly progress has been reset.";
            },
        },
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
        {
            name: "ribbon",
            message: "Adds a ribbon (1-20) to storage. Usage: w4 ribbon [1-20]",
            fn: (params) => {
                const ribbonLvl = parseInt(params[1]);
                if (isNaN(ribbonLvl) || ribbonLvl < 1 || ribbonLvl > 20) {
                    return "Please provide a ribbon lvl between 1 and 20.";
                }

                const ribbons = gga.Ribbon;
                for (let i = 0; i <= 27; i++) {
                    if (ribbons[i] === 0) {
                        ribbons[i] = ribbonLvl;
                        return `Added ribbon ${ribbonLvl} at storage index ${i}.`;
                    }
                }

                return "No empty storage slots available in the Ribbon storage";
            },
        },
        {
            name: "chips",
            message: "Adds to the amount of lab chips. Usage: w4 chips [chipname|all] [amount]",
            fn: (params) => {
                const target = params[1]?.toLowerCase();
                const amount = parseInt(params[2]);
                if (isNaN(amount)) {
                    return "Please provide a valid numeric amount.";
                }

                const lab = gga.Lab;
                const chipsCount = lab[15];

                const chipNames = cList.ChipDesc.map((c) => c[0].toLowerCase());

                if (target === "all") {
                    for (let i = 0; i < chipNames.length && i <= 21; i++) {
                        chipsCount[i] += amount;
                    }
                    return `Added ${amount} to all ${chipNames.length} chip counts.`;
                }

                const index = chipNames.indexOf(target);
                if (index === -1 || index >= chipNames.length) {
                    return `Chip "${target}" not found or out of range. Valid names: ${chipNames.slice(0, 22).join(", ")}`;
                }

                chipsCount[index] += amount;
                return `Added ${amount} to ${cList.ChipDesc[index][0]}.`;
            },
        },
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
        {
            name: "jargems",
            message: "Adds to the amount of jar gems. Usage: w5 jargems [jargem_name|all] [amount]",
            fn: (params) => {
                const target = params[1]?.toLowerCase();
                const amount = parseInt(params[2]);
                if (isNaN(amount)) {
                    return "Please provide a valid numeric amount.";
                }

                const holes = gga.Holes;
                const gemCounts = holes[24];

                const rawGems = cList.HolesInfo[67];
                const gemNames = rawGems.map((g) => g.split("|")[0].toLowerCase());

                if (target === "all") {
                    for (let i = 0; i < gemCounts.length && i < gemNames.length; i++) {
                        gemCounts[i] += amount;
                    }
                    return `Added ${amount} to all ${Math.min(gemCounts.length, gemNames.length)} jar gem counts.`;
                }

                const index = gemNames.indexOf(target);
                if (index === -1 || index >= gemCounts.length) {
                    return `Jar gem "${target}" not found or out of range. Valid names: ${gemNames.join(", ")}`;
                }

                gemCounts[index] += amount;
                return `Added ${amount} to ${rawGems[index].split("|")[0]}.`;
            },
        },
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
        { name: "emperor", message: "unlimited emperor tries" },
        { name: "endless", message: "easy endless runs for summoning" },
        { name: "sneaksymbol", message: "sneaksymbol 100% chance" },
        {
            name: "ninjaItem",
            message: "Generates a ninja item based on the floor which ninja twin is inputted.",
            fn: function (params) {
                const char = parseInt(params[1]);
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
            fn: (params) => {
                const unitName = params[1];
                if (!unitName) {
                    return `Please input a unit name ${[...summonUnits.keys()].join(", ")} to summon as per normal.`;
                }
                const summonUnit = summonUnits[unitName];
                if (summonUnit === undefined) {
                    return `no such unit ${unitName} found`;
                }
                if (unitName === "reset") {
                    cheatState.w6.sumunit = false;
                    cheatConfig.w6.sumunit = { UnitTypeDraw: (t) => t };
                    return `summoning units has been reset to default`;
                }

                cheatState.w6.sumunit = true;
                cheatConfig.w6.sumunit = { UnitTypeDraw: () => summonUnit };
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
        { name: "spelunkmana", message: "no stamina cost in spelunking" },
        {
            name: "spelunkdepth",
            message: "Sets the current spelunking depth. Usage: w7 spelunkdepth [layer]",
            fn: (params) => {
                const depth = parseInt(params[1]);
                if (isNaN(depth) || depth < 1) {
                    return "Please provide a valid numeric depth (1+).";
                }

                cheatConfig.w7.spelunkdepth = depth;
                return `Spelunking depth set to ${depth}. Go to the next layer to apply.`;
            },
        },
    ],
});
