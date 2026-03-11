/**
 * Events 312 Proxies
 *
 * Proxies for ActorEvents_312 (items menu):
 * - Preset reset anywhere
 * - Card passive UI marker synchronization
 */

import { cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { getCardMenuBehavior, getOwnedCardBonusKeys as getOwnedPassiveBonusKeys } from "../helpers/cardPassive.js";

function getPassiveBonusMap(context) {
    const map = context?._GenINFO?.[128]?.h;
    return map && typeof map === "object" ? map : null;
}

function getInjectedPassiveKeys(context) {
    if (!context) return null;

    if (!context._allCardPassiveInjectedKeys) {
        Object.defineProperty(context, "_allCardPassiveInjectedKeys", {
            value: new Set(),
            enumerable: false,
            configurable: true,
            writable: false,
        });
    }

    return context._allCardPassiveInjectedKeys;
}

function syncAllCardPassiveUiMarkers(context, enabled) {
    const passiveMap = getPassiveBonusMap(context);
    const injected = getInjectedPassiveKeys(context);
    if (!passiveMap || !injected) return;

    if (!enabled) {
        for (const key of injected) {
            delete passiveMap[key];
        }
        injected.clear();
        return;
    }

    const ownedBonusKeys = getOwnedPassiveBonusKeys({ skipPassiveText: true });

    for (const key of ownedBonusKeys) {
        if (!Object.prototype.hasOwnProperty.call(passiveMap, key)) {
            passiveMap[key] = 1;
            injected.add(key);
        }
    }
}

export function getCurrentNativePassiveBonusKeys() {
    const behavior = getCardMenuBehavior();
    const passiveMap = getPassiveBonusMap(behavior);
    if (!passiveMap) return new Set();

    const injected = getInjectedPassiveKeys(behavior);
    const nativeKeys = new Set();

    for (const key of Object.keys(passiveMap)) {
        if (!injected || !injected.has(key)) {
            nativeKeys.add(key);
        }
    }

    return nativeKeys;
}

export function refreshCardPassiveUiMarkers() {
    const behavior = getCardMenuBehavior();
    if (!behavior) return false;

    syncAllCardPassiveUiMarkers(behavior, cheatState.wide.cardpassive === true);
    return true;
}

/**
 * Setup items menu proxy (preset reset anywhere).
 *
 * NOTE: Intentionally deviates from "base first" pattern.
 * Preset reset cheat requires temporarily modifying CurrentMap before calling base
 * to bypass the location check, then restoring the original value.
 */
export function setupItemsMenuProxy() {
    const actorEvents312 = events(312);
    if (!actorEvents312?.prototype) return;

    const resetTalPresets = actorEvents312.prototype._event_resetTalPresets;
    if (!resetTalPresets?._isPatched) {
        actorEvents312.prototype._event_resetTalPresets = function (...args) {
            if (cheatState.unlock.presets) {
                const originalMap = gga.CurrentMap;
                gga.CurrentMap = 0;
                resetTalPresets.apply(this, args);
                gga.CurrentMap = originalMap;
                return;
            }
            return resetTalPresets.apply(this, args);
        };
        actorEvents312.prototype._event_resetTalPresets._isPatched = true;
    }

    const cardStuffEvent = actorEvents312.prototype._customEvent_cardStuff;
    if (typeof cardStuffEvent === "function" && !cardStuffEvent._allCardPassiveMarkerPatched) {
        actorEvents312.prototype._customEvent_cardStuff = function (...args) {
            const result = cardStuffEvent.apply(this, args);
            syncAllCardPassiveUiMarkers(this, cheatState.wide.cardpassive === true);
            return result;
        };
        actorEvents312.prototype._customEvent_cardStuff._allCardPassiveMarkerPatched = true;
    }

    refreshCardPassiveUiMarkers();
}
