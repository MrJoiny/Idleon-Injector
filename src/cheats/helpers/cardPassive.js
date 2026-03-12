/**
 * Card Passive Helper
 *
 * Shared helpers for card passive runtime logic.
 */

import { cList, events, getGameContext, gga } from "../core/globals.js";

const RIFT_PASSIVE_GROUPS = [
    { key: "RiftSkillBonus,0", indexes: [24, 25, 33, 34] },
    { key: "RiftSkillBonus,2", indexes: [27, 28, 36, 37] },
    { key: "RiftSkillBonus,3", indexes: [30, 31, 39, 45] },
    { key: "RiftSkillBonus,5", indexes: [32, 40, 41, 75] },
    { key: "RiftSkillBonus,6", indexes: [53, 57, 58] },
    { key: "RiftSkillBonus,8", indexes: [54, 55, 52] },
    { key: "RiftSkillBonus,18", indexes: [97, 98, 99] },
];

const VAULT_PASSIVE_GROUP = { key: "VaultUpgBonus", index: 44, indexes: [12] };

let cardRowsById = null;

export function getCardRowsById() {
    if (cardRowsById) return cardRowsById;

    const categories = cList?.CardStuff;
    if (!Array.isArray(categories) || categories.length === 0) {
        return new Map();
    }

    const map = new Map();

    for (const category of categories) {
        if (!Array.isArray(category)) continue;

        for (const row of category) {
            if (!Array.isArray(row)) continue;

            const cardId = row[0];
            if (typeof cardId !== "string" || !cardId || cardId === "Blank") continue;
            map.set(cardId, row);
        }
    }

    if (map.size > 0) {
        cardRowsById = map;
    }

    return map;
}

export function parseCardIdList(value) {
    const set = new Set();

    for (const cardIdRaw of String(value ?? "").split(",")) {
        const cardId = String(cardIdRaw || "").trim();
        if (!cardId || cardId === "0" || cardId === "B") continue;
        set.add(cardId);
    }

    return set;
}

export function safeGetBehavior(actor, behaviorName) {
    const getBehavior = actor?.behaviors?.getBehavior;
    if (typeof getBehavior !== "function") return null;

    try {
        return getBehavior.call(actor.behaviors, behaviorName) || null;
    } catch {
        return null;
    }
}

export function getCardMenuBehavior() {
    const actors = gga?.PixelHelperActor;
    if (!actors || typeof actors !== "object") return null;

    for (const actor of Object.values(actors)) {
        const behavior = safeGetBehavior(actor, "ActorEvents_312");
        if (behavior) return behavior;
    }

    return null;
}

export function getOwnedCardBonusKeys({ skipPassiveText = false } = {}) {
    const ownedCards = gga?.Cards?.[0]?.h;
    const rowsById = getCardRowsById();
    const bonusKeys = new Set();

    if (!ownedCards) return bonusKeys;

    for (const [cardId, countRaw] of Object.entries(ownedCards)) {
        const ownedCount = Number(countRaw);
        if (!Number.isFinite(ownedCount) || ownedCount <= 0) continue;

        const row = rowsById.get(cardId);
        if (!row) continue;

        const bonusKey = row[3];
        if (typeof bonusKey !== "string" || !bonusKey) continue;
        if (skipPassiveText && bonusKey.toLowerCase().includes("passive")) continue;

        bonusKeys.add(bonusKey);
    }

    return bonusKeys;
}

export function collectPotentialCardCalcContexts() {
    const results = [];
    const seen = new Set();

    const addTarget = (target) => {
        if (!target || typeof target._customBlock_RunCodeOfTypeXforThingY !== "function") return;
        if (seen.has(target)) return;

        results.push(target);
        seen.add(target);
    };

    const actors = gga?.PixelHelperActor;
    if (actors && typeof actors === "object") {
        for (const actor of Object.values(actors)) {
            addTarget(safeGetBehavior(actor, "ActorEvents_12"));
        }
    }

    const event12 = events(12);
    addTarget(event12);
    addTarget(event12?.prototype);

    const context = getGameContext();
    const scripts = context?.scripts;
    const script12 = scripts?.ActorEvents_12;
    if (script12) {
        addTarget(script12);
        addTarget(script12?.prototype);
    }

    return results;
}

function resolvePassiveBonusKey(idMap, index) {
    if (!idMap) return null;

    const value = idMap[index];
    return typeof value === "string" && value ? value : null;
}

export function getNativePassiveBonusKeysFromUnlocks(context) {
    const keys = new Set();
    const idMap = gga?.CustomMaps?.h?.IDforCardBonus?.h;
    if (!idMap) return keys;

    const canCheckRift = typeof context?._customBlock_RiftStuff === "function";
    const canCheckVault = typeof context?._customBlock_Summoning === "function";

    if (canCheckRift) {
        for (const group of RIFT_PASSIVE_GROUPS) {
            const active = Number(context._customBlock_RiftStuff(group.key, 2));
            if (!Number.isFinite(active) || active <= 0.1) continue;

            for (const index of group.indexes) {
                const bonusKey = resolvePassiveBonusKey(idMap, index);
                if (bonusKey) keys.add(bonusKey);
            }
        }
    }

    if (canCheckVault) {
        const active = Number(context._customBlock_Summoning(VAULT_PASSIVE_GROUP.key, VAULT_PASSIVE_GROUP.index, 0));
        if (Number.isFinite(active) && active > 0.1) {
            for (const index of VAULT_PASSIVE_GROUP.indexes) {
                const bonusKey = resolvePassiveBonusKey(idMap, index);
                if (bonusKey) keys.add(bonusKey);
            }
        }
    }

    return keys;
}
