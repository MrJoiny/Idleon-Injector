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
import { registerCommonVariables, cList, firebase, gameContext, gga, monsterDefs } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";
import { setupCListProxy } from "./clist.js";
import { setupGameAttributeProxies } from "./gameAttributes.js";
import { setupItemProxies } from "./items.js";

let getCompanionInfoMe;

/** The player's real companion entries, bypassing the W1 Companion spoof. */
export const getOwnedCompanions = () => Reflect.apply(getCompanionInfoMe, firebase, []) || [];

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

    getCompanionInfoMe = firebase.getCompanionInfoMe;
    const companionEntryId = (entry) => parseInt(String(entry).split(",")[0]);

    // A configured list names the pets to fake-own, it does not describe the whole
    // collection: the player's real companions are merged back in, entries the config
    // mentions winning on id. Partial lists must preserve unrelated owned pets.
    const mergeWithOwnedCompanions = (entries, owned) => {
        const byId = new Map(owned.map((entry) => [companionEntryId(entry), entry]));
        entries.forEach((entry) => byId.set(companionEntryId(entry), entry));
        return [...byId.values()];
    };

    firebase.getCompanionInfoMe = function (...args) {
        const base = Reflect.apply(getCompanionInfoMe, this, args);
        if (cheatState.w1.companion) {
            // Pet-token picks (OptionsListAccount[606]) stay out of the fake list: the game
            // refunds a token whose pet looks owned, which would drop it from the save.
            const tokenIds = gga.OptionsListAccount[606] ? String(gga.OptionsListAccount[606]).split(",") : [];
            const isNotToken = (entry) => !tokenIds.includes(String(companionEntryId(entry)));
            if (!cheatConfig.w1.companion.companions) {
                return Array.from({ length: cList.CompanionDB.length }, (_, index) => `${index},0,0,0,1`).filter(
                    (entry) => monsterDefs[cList.CompanionDB[parseInt(entry)][0]]?.h.Name && isNotToken(entry)
                );
            }
            const companions = cheatConfig.w1.companion.companions;
            if (typeof companions === "string") {
                const entries = companions
                    .split(",")
                    .map((entry) => entry.trim().split(":"))
                    .filter(([id]) => /^\d+$/.test(id))
                    // Bare IDs retain the legacy Pets+ tier; :0 requests the normal tier.
                    .map(([id, tier]) => `${Number(id)},0,0,0,${tier === "0" ? "0" : "1"}`);
                return mergeWithOwnedCompanions(entries.filter(isNotToken), base || []);
            }
            if (Array.isArray(companions)) {
                const entries = companions.map((entry) => {
                    if (typeof entry === "number") return `${entry},0,0,0,1`;
                    if (typeof entry === "string" && !entry.includes(",")) return `${entry},0,0,0,1`;
                    return entry;
                });
                return mergeWithOwnedCompanions(entries.filter(isNotToken), base || []);
            }
            return companions;
        }
        return base;
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
            const otherPlayers = gga.OtherPlayers.h;
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
            setupItemProxies();
        } catch (e) {
            console.error("Error re-applying proxies after character selection:", e);
        }

        return base;
    });
}
