/**
 * Wide Cheats
 *
 * Account-wide cheats:
 * - gembuylimit, mtx, post, guild, task, quest, star
 * - giant, gems, plunderous, candy, candytime, nodmg
 * - eventitems, autoloot, perfectobols, autoparty
 * - arcade, eventspins, hoopshop, dartshop, guildpoints
 * - buy (gem shop packs)
 */

import { registerCheats, registerCheat } from "../core/registration.js";
import { cheatState, cheatConfig } from "../core/state.js";
import { rollAllObols } from "../helpers/obolRolling.js";
import { knownBundles } from "../constants.js";

// Build lookup map from bundle code to display name
const bundleCodeToName = new Map(knownBundles.map(([name, code]) => [code, name]));

// Wide (account-wide) cheats
registerCheats({
    name: "wide",
    message: "all account-wide cheats",
    canToggleSubcheats: true,
    subcheats: [
        {
            name: "gembuylimit",
            fn: function (params) {
                if (cheatState.wide.gembuylimit && !params[1]) {
                    cheatState.wide.gembuylimit = false;
                    return `Disabled gembuylimit.`;
                }
                if (Number.isInteger(Number(params[1]))) {
                    cheatConfig.wide.gembuylimit = Number(params[1]);
                    cheatState.wide.gembuylimit = true;
                    return `Set max gem item purchases to ${cheatConfig.wide.gembuylimit}.`;
                } else {
                    return `Parameter must be an integer.`;
                }
            },
            message: "set max gem item purchases",
        },
        { name: "mtx", message: "gem shop cost nullification" },
        { name: "post", message: "post cost nullification" },
        { name: "guild", message: "guild cost nullification" },
        { name: "task", message: "task cost nullification" },
        { name: "quest", message: "quest item requirment nullification" },
        { name: "star", message: "star point requirement nullification" },
        { name: "giant", message: "100% giant mob spawn rate" },
        { name: "gems", message: "freezes current gem amount" },
        {
            name: "plunderous",
            message: "100% plunderous mob spawn rate",
            configurable: { isObject: true },
        },
        { name: "candy", message: "candy use everywhere" },
        {
            name: "candytime",
            message: "buffs 1 hr candys in minutes",
            configurable: true,
        },
        { name: "nodmg", message: "no damage numbers" },
        { name: "eventitems", message: "unlimited event item drops" },
        {
            name: "autoloot",
            message: "autoloot immeditely to inventory. Optionally add config to move directly to your chest.",
            configurable: { isObject: true },
        },
        {
            name: "perfectobols",
            message: "Roll all obols perfectly for class. Family and inventory obols update on character change.",
            fn: function (params) {
                if (!cheatState.wide[params[0]]) rollAllObols();
                cheatState.wide[params[0]] = !cheatState.wide[params[0]];
                return `${
                    cheatState.wide[params[0]] ? "Activated" : "Deactivated"
                } Perfect obol rolls. Family and inventory obols update on character change.`;
            },
        },
        {
            name: "autoparty",
            message: "Automatically add on screen players to your party",
        },
        {
            name: "arcade",
            message: "arcade cost nullify",
            configurable: { isObject: true },
        },
        {
            name: "eventspins",
            message: "Infinite event spins",
        },
        {
            name: "hoopshop",
            message: "hoopshop cost nullify",
            configurable: { isObject: true },
        },
        {
            name: "dartshop",
            message: "dartshop cost nullify",
            configurable: { isObject: true },
        },
        {
            name: "guildpoints",
            message: "Adds 1200 guild points to the guild.",
            fn: function () {
                this["FirebaseStorage"].guildPointAdjust(1200);
                return "Added 1200 guild points to the guild.";
            },
        },
    ],
});

// Talent cheats
registerCheats({
    name: "talent",
    message: "talent value override cheats",
    configurable: true,
    subcheats: [
        { name: "168", message: "Orb of remembrance", configurable: true },
        { name: "169", message: "Imbuted shokwaves", configurable: true },
        { name: "318", message: "Pirate flag", configurable: true },
        { name: "120", message: "shockwave slash", configurable: true },
        { name: "483", message: "Tenteyecle", configurable: true },
        { name: "45", message: "Void trial rerun", configurable: true },
    ],
});

// Buy gem shop packs
registerCheat(
    "buy",
    function (params) {
        const code = params[0];
        if (!code) {
            const validCodes = knownBundles.map(([name, c]) => `${c} (${name})`).join("\n");
            return `Usage: buy [bundle_code]\nValid codes:\n${validCodes}`;
        }

        const name = bundleCodeToName.get(code) || code;
        this["FirebaseStorage"].addToMessageQueue("SERVER_CODE", "SERVER_ITEM_BUNDLE", code);
        return `${name} has been bought!`;
    },
    "Buy gem shop packs. You get items from the pack, but no gems and no pets."
);
