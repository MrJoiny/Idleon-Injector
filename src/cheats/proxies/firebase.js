/**
 * Firebase Proxy
 *
 * Proxies for Firebase storage functions:
 * - playButton (re-initialize proxies on character selection)
 * - Companion management (delete, swap, set, get)
 * - Party members
 * - Unban (cleanMarkedFiles)
 * - Steam achievements (prevent duplicates)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, registerCommonVariables, cList, firebase, gameContext } from "../core/globals.js";
import { setupCListProxy } from "./clist.js";

/**
 * Setup Firebase storage proxy (companion, party, unban).
 */
export function setupFirebaseStorageProxy() {
    const deleteCompanion = firebase.deleteCompanion;
    firebase.deleteCompanion = function (...args) {
        if (cheatState.w1.companion) return Promise.resolve(1);
        return Reflect.apply(deleteCompanion, this, args);
    };

    const swapCompanionOrder = firebase.swapCompanionOrder;
    firebase.swapCompanionOrder = function (...args) {
        if (cheatState.w1.companion) return Promise.resolve(1);
        return Reflect.apply(swapCompanionOrder, this, args);
    };

    const setCompanionFollower = firebase.setCompanionFollower;
    firebase.setCompanionFollower = function (...args) {
        if (cheatState.w1.companion) {
            cheatConfig.w1.companion.current = String(args[0]);
        }
        return Reflect.apply(setCompanionFollower, this, args);
    };

    const getCompanionInfoMe = firebase.getCompanionInfoMe;
    firebase.getCompanionInfoMe = function (...args) {
        if (cheatState.w1.companion) {
            if (!cheatConfig.w1.companion.companions) {
                return Array.from({ length: cList.CompanionDB.length }, (_, index) => index);
            }
            const companions = cheatConfig.w1.companion.companions;
            if (typeof companions === "function") return companions();
            return companions;
        }
        return Reflect.apply(getCompanionInfoMe, this, args);
    };

    const getCurrentCompanion = firebase.getCurrentCompanion;
    firebase.getCurrentCompanion = function (...args) {
        if (cheatState.w1.companion) return cheatConfig.w1.companion.current;
        return Reflect.apply(getCurrentCompanion, this, args);
    };

    const cleanMarkedFiles = firebase.cleanMarkedFiles;
    firebase.cleanMarkedFiles = function (...args) {
        if (cheatConfig.unban) return;
        return Reflect.apply(cleanMarkedFiles, this, args);
    };

    const getPartyMembers = firebase.getPartyMembers;
    firebase.getPartyMembers = function (...args) {
        const resp = Reflect.apply(getPartyMembers, this, args);
        if (!cheatState.wide.autoparty) return resp;

        if (Array.isArray(resp) && resp.length > 0 && resp.length < 10) {
            const playersToAdd = 11 - resp.length;
            const otherPlayers = bEngine.gameAttributes.h.OtherPlayers.h;
            const names = Object.keys(otherPlayers).slice(1, playersToAdd);
            for (const name of names) {
                resp.push([name, resp[0][1], 0]);
            }
        }
        return resp;
    };
}

/**
 * Setup steam achievement proxy (prevent duplicate achievements).
 */
export function setupSteamAchievementProxy() {
    const achieveList = [];
    const areaCheck = firebase.areaCheck;
    firebase.areaCheck = function (...args) {
        if (!cheatConfig.steamachieve) return;
        if (achieveList.includes(args[0])) return;
        achieveList.push(args[0]);
        return Reflect.apply(areaCheck, this, args);
    };
}

/**
 * Setup Firebase proxy to handle character selection screen.
 *
 * When player returns from character selection, some game data is reloaded.
 * This proxy catches that and re-initializes the necessary proxies.
 */
export function setupFirebaseProxy() {
    const playButton = firebase.playButton;
    if (!playButton) return;

    firebase.playButton = function (...args) {
        const result = Reflect.apply(playButton, this, args);

        // Register common variables again
        registerCommonVariables(gameContext);

        // Re-apply proxies that get reset
        try {
            setupCListProxy();
        } catch (e) {
            console.error("Error re-applying proxies after character selection:", e);
        }

        return result;
    };
}
