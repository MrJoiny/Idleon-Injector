/**
 * cList Proxies
 *
 * Proxies for cList (Custom Lists) data structures:
 * - MTX (gem shop costs and limits)
 * - Refinery costs
 * - Vial unlock chances
 * - Salt lick upgrade costs
 * - Prayer requirements
 * - Post office order costs
 * - Guild task requirements
 * - Task requirements
 * - Star sign unlock requirements
 * - Worship costs
 * - Card stats (godlike card)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { cList } from "../core/globals.js";
import { traverse } from "../utils/traverse.js";
import { createProxy, nullifyListCost } from "../utils/proxy.js";

/**
 * Setup all cList proxies.
 * This modifies the game's custom lists to enable various cheats.
 */
export function setupCListProxy() {
    // Prevent running multiple times if already proxied
    if (cList._isPatched) return;
    Object.defineProperty(cList, "_isPatched", { value: true, enumerable: false });

    // Nullify MTX cost
    nullifyListCost(cList.MTXinfo, 3, [3, 7], "wide.mtx", 0);

    // Nullify refinery cost
    nullifyListCost(cList.RefineryInfo, 1, [6, 7, 8, 9, 10, 11], "w3.refinery", "0");

    // Nullify Salt Lick upgrade cost
    nullifyListCost(cList.SaltLicks, 1, 2, "w3.saltlick", "0");

    // Nullify prayer requirements (indexes 4 and 6)
    nullifyListCost(cList.PrayerInfo, 1, [4, 6], "w3.prayer", "0");

    // Nullify post office order cost
    nullifyListCost(cList.PostOfficePossibleOrders, 3, 1, "wide.post", "0");

    // Nullify guild task requirements
    nullifyListCost(cList.GuildGPtasks, 1, 1, "wide.guild", "0");

    // Nullify task requirements (indexes 5-14)
    nullifyListCost(cList.TaskDescriptions, 2, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14], "wide.task", "0");

    // Nullify star sign unlock requirement
    nullifyListCost(cList.SSignInfoUI, 1, 4, "wide.star", "0");

    // Nullify worship cost
    nullifyListCost(cList.WorshipBASEinfos, 1, 6, "w3.freeworship", "0");

    // Gem buy limit (not a simple nullify operation)
    const gembuylimitIndex = 5;
    traverse(cList.MTXinfo, 3, (data) => {
        createProxy(data, gembuylimitIndex, (original) => {
            if (cheatState.wide.gembuylimit) {
                return Math.max(original, cheatConfig.wide?.gembuylimit ?? 0);
            }
            return original;
        });
    });

    // Vials unlock at rolling 1+
    const vials = cList.AlchemyVialItemsPCT;
    createProxy(cList, "AlchemyVialItemsPCT", (original) => {
        if (cheatState.w2.vialrng) return new Array(vials.length).fill(99);
        return original;
    });

    // Prayer description override (part of prayer cheat)
    traverse(cList.PrayerInfo, 1, (data) => {
        createProxy(data, 2, (original) => {
            if (cheatState.w3.prayer) return "None._Even_curses_need_time_off_every_now_and_then";
            return original;
        });
    });

    // Godlike Card boost prox
    traverse(cList.CardStuff, 2, (card) => {
        createProxy(card, 4, (original) => {
            if (cheatState.godlike.card) {
                const numValue = parseFloat(original);
                return String(numValue * 100);
            }
            return original;
        });
    });
}
