/**
 * CList Proxies
 *
 * Proxies for CList (Custom Lists) data structures:
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
import { CList } from "../core/globals.js";
import { createProxy } from "../utils/createProxy.js";
import { traverse } from "../utils/traverse.js";

/**
 * Setup all CList proxies.
 * This modifies the game's custom lists to enable various cheats.
 */
export function setupCListProxy() {
    // Prevent running multiple times if already proxied
    if (CList._isPatched) return;
    Object.defineProperty(CList, "_isPatched", { value: true, enumerable: false });

    // Nullify MTX cost / Set gem buy limit
    const mtxIndex = [3, 7];
    const gembuylimitIndex = 5;

    traverse(CList.MTXinfo, 3, (data) => {
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

    traverse(CList.RefineryInfo, 1, (data) => {
        refineryIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.w3.refinery) return "0";
                return original;
            });
        });
    });

    // Vials unlock at rolling 1+
    const vials = CList.AlchemyVialItemsPCT;
    createProxy(CList, "AlchemyVialItemsPCT", (original) => {
        if (cheatState.w2.vialrng) return new Array(vials.length).fill(99);
        return original;
    });

    // Nullify Salt Lick upgrade cost
    traverse(CList.SaltLicks, 1, (data) => {
        createProxy(data, 2, (original) => {
            if (cheatState.w3.saltlick) return "0";
            return original;
        });
    });

    // Nullify prayer requirements
    const prayerIndex = [4, 6];

    traverse(CList.PrayerInfo, 1, (data) => {
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
    traverse(CList.PostOfficePossibleOrders, 3, (data) => {
        createProxy(data, 1, (original) => {
            if (cheatState.wide.post) return "0";
            return original;
        });
    });

    // Nullify guild task requirements
    traverse(CList.GuildGPtasks, 1, (data) => {
        createProxy(data, 1, (original) => {
            if (cheatState.wide.guild) return "0";
            return original;
        });
    });

    // Nullify task requirements
    const taskIndex = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

    traverse(CList.TaskDescriptions, 2, (data) => {
        taskIndex.forEach((index) => {
            createProxy(data, index, (original) => {
                if (cheatState.wide.task) return "0";
                return original;
            });
        });
    });

    // Nullify star sign unlock requirement
    traverse(CList.SSignInfoUI, 1, (data) => {
        createProxy(data, 4, (original) => {
            if (cheatState.wide.star) return "0";
            return original;
        });
    });

    // Nullify worship cost
    traverse(CList.WorshipBASEinfos, 1, (data) => {
        createProxy(data, 6, (original) => {
            if (cheatState.w3.freeworship) return "0";
            return original;
        });
    });
}

/**
 * Initialize CList proxies.
 */
export function initCListProxies() {
    setupCListProxy();
}
