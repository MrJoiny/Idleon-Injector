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
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { cList } from "../core/globals.js";
import { createProxy } from "../utils/createProxy.js";
import { traverse } from "../utils/traverse.js";

/**
 * Setup all cList proxies.
 * This modifies the game's custom lists to enable various cheats.
 */
export function setupCListProxy() {
    // Prevent running multiple times if already proxied
    if (cList._isPatched) return;
    Object.defineProperty(cList, "_isPatched", { value: true, enumerable: false });

    // Nullify MTX cost / Set gem buy limit
    const mtxIndex = [3, 7];
    const gembuylimitIndex = 5;

    traverse(cList.MTXinfo, 3, (data) => {
        // free mtx
        mtxIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.wide.mtx) return 0;
                return original;
            });
        });

        // gem buy limit
        createProxy(data, gembuylimitIndex, (original) => {
            if (cheatState.wide.gembuylimit) return Math.max(original, cheatConfig?.wide?.gembuylimit ?? original);
            return original;
        });
    });

    // Nullify refinery cost
    const refineryIndex = [6, 7, 8, 9, 10, 11];

    traverse(cList.RefineryInfo, 1, (data) => {
        refineryIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.w3.refinery) return "0";
                return original;
            });
        });
    });

    // Vials unlock at rolling 1+
    const vials = cList.AlchemyVialItemsPCT;
    createProxy(cList, "AlchemyVialItemsPCT", (original) => {
        if (cheatState.w2.vialrng) return new Array(vials.length).fill(99);
        return original;
    });

    // Nullify Salt Lick upgrade cost
    traverse(cList.SaltLicks, 1, (data) => {
        createProxy(data, 2, (original) => {
            if (cheatState.w3.saltlick) return "0";
            return original;
        });
    });

    // Nullify prayer requirements
    const prayerIndex = [4, 6];

    traverse(cList.PrayerInfo, 1, (data) => {
        prayerIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.w3.prayer) return "0";
                return original;
            });
        });

        createProxy(data, 2, (original) => {
            if (cheatState.w3.prayer) return "None._Even_curses_need_time_off_every_now_and_then.";
            return original;
        });
    });

    // Nullify post office order cost
    traverse(cList.PostOfficePossibleOrders, 3, (data) => {
        createProxy(data, 1, (original) => {
            if (cheatState.wide.post) return "0";
            return original;
        });
    });

    // Nullify guild task requirements
    traverse(cList.GuildGPtasks, 1, (data) => {
        createProxy(data, 1, (original) => {
            if (cheatState.wide.guild) return "0";
            return original;
        });
    });

    // Nullify task requirements
    const taskIndex = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    traverse(cList.TaskDescriptions, 2, (data) => {
        taskIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.wide.task) return "0";
                return original;
            });
        });
    });

    // Nullify star sign unlock requirement
    traverse(cList.SSignInfoUI, 1, (data) => {
        createProxy(data, 4, (original) => {
            if (cheatState.wide.star) return "0";
            return original;
        });
    });

    // Nullify worship cost
    traverse(cList.WorshipBASEinfos, 1, (data) => {
        createProxy(data, 6, (original) => {
            if (cheatState.w3.freeworship) return "0";
            return original;
        });
    });
}
