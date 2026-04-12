/**
 * Wide Cheats
 *
 * Account-wide cheats:
 * - gembuylimit, mtx, post, guild, task, quest, star
 * - giant, gems, plunderous, candy, candytime, nodmg
 * - hidenames, noanim, bigmodel, eventitems, autoloot, perfectobols, autoparty
 * - arcade, eventspins, hoopshop, dartshop, guildpoints, cardcopy, cardpassive
 */

import { registerCheats } from "../core/registration.js";
import { cheatState } from "../core/state.js";
import { firebase, gga } from "../core/globals.js";
import { deepCopy } from "../utils/deepCopy.js";
import { rollAllObols } from "../helpers/obolRolling.js";

// Wide (account-wide) cheats
registerCheats({
    name: "wide",
    message: "all account-wide cheats",
    allowToggleChildren: true,
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
        { name: "hidenames", message: "hide player names in world and UI" },
        { name: "noanim", message: "stop all game animations" },
        { name: "bigmodel", message: "set all player model sizes on spawn", configurable: true },
        { name: "eventitems", message: "unlimited event item drops" },
        { name: "autoloot", message: "autoloot immeditely to chest. Check config for more" },
        { name: "autoparty", message: "Automatically add on screen players to your party" },
        { name: "arcade", message: "arcade cost nullify" },
        { name: "eventspins", message: "Infinite event spins" },
        { name: "hoopshop", message: "hoopshop cost nullify" },
        { name: "dartshop", message: "dartshop cost nullify" },
        {
            name: "guildpoints",
            message: "Adds guild points to the guild (max 1200 per week)",
            needsParam: true,
            fn: function (params) {
                const amount = parseInt(params[1]) || 1200;
                firebase.guildPointAdjust(amount);
                return `Added ${amount} guild points to the guild`;
            },
        },
        {
            name: "perfectobols",
            message: "Roll all obols perfectly for class. Family and inventory obols update on character change",
            fn: function () {
                cheatState.wide.perfectobols = !cheatState.wide.perfectobols;
                if (cheatState.wide.perfectobols) rollAllObols();
                return `${
                    cheatState.wide.perfectobols ? "Activated" : "Deactivated"
                } Perfect obol rolls. Family and inventory obols update on character change.`;
            },
        },
        {
            name: "cardcopy",
            message: "Copies current CardPreset to all players",
            fn: function () {
                const cardPreset = deepCopy(gga.CardPreset);
                const players = gga.PlayerDATABASE.h;
                let count = 0;

                for (const playerName in players) {
                    players[playerName].h.CardPreset = deepCopy(cardPreset);
                    const cardPresetIndex = players[playerName].h.PlayerStuff[2];
                    players[playerName].h.CardEquip = deepCopy(cardPreset[cardPresetIndex]);

                    count++;
                }

                return `Copied CardPreset to ${count} player(s).`;
            },
        },
        { name: "cardpassive", message: "all cards always give bonus (passive)" },
    ],
});
