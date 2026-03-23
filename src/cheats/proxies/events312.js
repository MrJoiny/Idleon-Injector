/**
 * Events 312 Proxies
 *
 * Proxies for ActorEvents_312 (items menu):
 * - Preset reset anywhere
 * - Card passive UI marker synchronization
 */

import { cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import {
    getCardMenuBehavior,
    getCardRowsById,
    getNativePassiveBonusKeysFromUnlocks,
    parseCardIdList,
} from "../helpers/cardPassive.js";

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

function getNativePassiveBonusKeysForContext(context, injectedSet = null) {
    const passiveMap = getPassiveBonusMap(context);
    const merged = new Set();

    if (passiveMap) {
        for (const key of Object.keys(passiveMap)) {
            if (injectedSet && injectedSet.has(key)) continue;
            merged.add(key);
        }
    }

    const unlockedKeys = getNativePassiveBonusKeysFromUnlocks(context);
    for (const key of unlockedKeys) {
        merged.add(key);
    }

    return merged;
}

function getDesiredInjectedPassiveBonusKeys(context, nativeKeys) {
    const desiredKeys = new Set();
    const ownedCards = gga?.Cards?.[0]?.h;
    if (!ownedCards) return desiredKeys;

    const rowsById = getCardRowsById();
    const equippedCards = Array.isArray(gga?.Cards?.[2]) ? gga.Cards[2] : [];
    const equippedSet = new Set(
        equippedCards.filter((cardId) => typeof cardId === "string" && cardId && cardId !== "B")
    );
    const alreadyPassiveSet = parseCardIdList(gga?.OptionsListAccount?.[155]);

    for (const [cardId, countRaw] of Object.entries(ownedCards)) {
        const ownedCount = Number(countRaw);
        if (!Number.isFinite(ownedCount) || ownedCount <= 0) continue;
        if (equippedSet.has(cardId) || alreadyPassiveSet.has(cardId)) continue;

        const row = rowsById.get(cardId);
        if (!row) continue;

        const bonusKey = row[3];
        if (typeof bonusKey !== "string" || !bonusKey) continue;
        if (bonusKey.toLowerCase().includes("passive")) continue;
        if (nativeKeys.has(bonusKey)) continue;

        desiredKeys.add(bonusKey);
    }

    return desiredKeys;
}

function syncAllCardPassiveUiMarkers(context, enabled) {
    const passiveMap = getPassiveBonusMap(context);
    const injected = getInjectedPassiveKeys(context);
    if (!passiveMap || !injected) return;

    const nativeKeys = getNativePassiveBonusKeysForContext(context, injected);

    if (!enabled) {
        for (const key of [...injected]) {
            if (!nativeKeys.has(key)) {
                delete passiveMap[key];
            }
            injected.delete(key);
        }
        return;
    }

    const desiredKeys = getDesiredInjectedPassiveBonusKeys(context, nativeKeys);

    for (const key of [...injected]) {
        if (desiredKeys.has(key)) continue;

        if (!nativeKeys.has(key)) {
            delete passiveMap[key];
        }
        injected.delete(key);
    }

    for (const key of desiredKeys) {
        if (!Object.prototype.hasOwnProperty.call(passiveMap, key)) {
            passiveMap[key] = 1;
        }
        injected.add(key);
    }
}

export function getCurrentNativePassiveBonusKeys() {
    const behavior = getCardMenuBehavior();
    if (!behavior) return new Set();
    const injected = getInjectedPassiveKeys(behavior);
    return getNativePassiveBonusKeysForContext(behavior, injected);
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
    if (typeof resetTalPresets === "function" && !resetTalPresets._isPatched) {
        actorEvents312.prototype._event_resetTalPresets = function (...args) {
            if (cheatState.unlock.presets) {
                const originalMap = gga.CurrentMap;
                try {
                    gga.CurrentMap = 0;
                    return resetTalPresets.apply(this, args);
                } finally {
                    gga.CurrentMap = originalMap;
                }
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
