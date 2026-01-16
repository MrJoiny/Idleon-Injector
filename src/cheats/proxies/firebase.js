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
import { createMethodProxy } from "../utils/proxy.js";
import { setupCListProxy } from "./clist.js";
import { setupGameAttributeProxies } from "./gameAttributes.js";
import { setupTimeCandyProxy } from "./misc.js";

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

    createMethodProxy(firebase, "getPartyMembers", (base) => {
        if (!cheatState.wide.autoparty) return base;

        if (Array.isArray(base) && base.length > 0 && base.length < 10) {
            const playersToAdd = 11 - base.length;
            const otherPlayers = bEngine.gameAttributes.h.OtherPlayers.h;
            const names = Object.keys(otherPlayers).slice(1, playersToAdd);
            for (const name of names) {
                base.push([name, base[0][1], 0]);
            }
        }
        return base;
    });
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
 * When player returns from character selection, some game data objects
 * are recreated. The _isPatched flag on those objects will be undefined,
 * allowing the proxies to be re-applied to the new object references.
 */
export function setupFirebaseProxy() {
    if (!firebase.playButton) return;

    createMethodProxy(firebase, "playButton", (base) => {
        // Register common variables again
        registerCommonVariables(gameContext);

        // Re-apply proxies that depend on game data objects that get
        // recreated during character selection. The _isPatched guard
        // in each setup function will only apply if the object is new.
        try {
            setupCListProxy();
            setupGameAttributeProxies();
            setupTimeCandyProxy();
        } catch (e) {
            console.error("Error re-applying proxies after character selection:", e);
        }

        return base;
    });
}
