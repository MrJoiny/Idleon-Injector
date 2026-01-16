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
import { cheatState } from "../core/state.js";
import { rollAllObols } from "../helpers/obolRolling.js";

// Wide (account-wide) cheats
registerCheats({
    name: "wide",
    message: "all account-wide cheats",
    canToggleSubcheats: true,
    subcheats: [
        { name: "gembuylimit", message: "set max gem item purchases", configurable: true },
        { name: "mtx", message: "gem shop cost nullification" },
        { name: "post", message: "post cost nullification" },
        { name: "guild", message: "guild cost nullification" },
        { name: "task", message: "task cost nullification" },
        { name: "quest", message: "quest item requirement nullification" },
        { name: "star", message: "star point requirement nullification" },
        { name: "giant", message: "100% giant mob spawn rate" },
        { name: "gems", message: "freezes current gem amount" },
        { name: "plunderous", message: "100% plunderous mob spawn rate" },
        { name: "candy", message: "candy use everywhere" },
        { name: "candytime", message: "buffs 1 hr candys in minutes", configurable: true },
        { name: "nodmg", message: "no damage numbers" },
        { name: "eventitems", message: "unlimited event item drops" },
        { name: "autoloot", message: "autoloot immeditely to chest. Check config for more" },
        { name: "autoparty", message: "Automatically add on screen players to your party" },
        { name: "arcade", message: "arcade cost nullify" },
        { name: "eventspins", message: "Infinite event spins" },
        { name: "hoopshop", message: "hoopshop cost nullify" },
        { name: "dartshop", message: "dartshop cost nullify" },
        {
            name: "guildpoints",
            message: "Adds 1200 guild points to the guild.",
            fn: function () {
                this.FirebaseStorage.guildPointAdjust(1200);
                return "Added 1200 guild points to the guild.";
            },
        },
        {
            name: "perfectobols",
            message: "Roll all obols perfectly for class. Family and inventory obols update on character change.",
            fn: function () {
                if (!cheatState.wide.perfectobols) rollAllObols();
                cheatState.wide.perfectobols = !cheatState.wide.perfectobols;
                return `${
                    cheatState.wide.perfectobols ? "Activated" : "Deactivated"
                } Perfect obol rolls. Family and inventory obols update on character change.`;
            },
        },
    ],
});

// Talent cheats
registerCheats({
    name: "talent",
    message: "talent value override cheats",
    subcheats: [
        { name: "168", message: "Orb of remembrance" },
        { name: "169", message: "Imbuted shokwaves" },
        { name: "318", message: "Pirate flag" },
        { name: "120", message: "shockwave slash" },
        { name: "483", message: "Tenteyecle" },
        { name: "45", message: "Void trial rerun" },
    ],
});

// Buy gem shop packs
registerCheat({
    name: "buy",
    message: "Buy gem shop packs. You get items from the pack, but no gems and no pets.",
    fn: function (params) {
        const code = params[0];
        if (!code) {
            return "No code was given, provide a code";
        }

        this.FirebaseStorage.addToMessageQueue("SERVER_CODE", "SERVER_ITEM_BUNDLE", code);
        return `${code} has been sent!`;
    },
});
