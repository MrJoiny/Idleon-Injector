import { cList, events, gga } from "../core/globals.js";

// These are modifier maxima from the native drop handlers, not tooltip totals.
export function arcaneRoll(item, quality) {
    if (!Number.isFinite(quality) || quality <= 0)
        throw new Error("Arcane equipment quality is unavailable or locked.");
    if (item === "EquipmentWandsArc0")
        return {
            Speed: Math.min(6, 2 + Math.floor(quality / 300)),
            Weapon_Power: 15 + Math.floor(quality / 25),
            UQ1val: 50 + Math.floor(quality / 20),
            UQ2val: 30 + Math.floor(quality / 15),
            AwesomeStats: 1,
        };
    if (item === "EquipmentRingsArc0")
        return {
            UQ1val: 40 + Math.floor(quality / 15),
            UQ2val: 30 + Math.floor(quality / 10),
            AwesomeStats: 1,
        };
    throw new Error("Unknown Arcane equipment.");
}

export function tempestRoll(item, worldIndex) {
    if (/^EquipmentBowsTempest[0-4]$/.test(item)) {
        if (!Number.isSafeInteger(worldIndex) || worldIndex < 0)
            throw new Error("No unlocked world can drop this Tempest bow.");
        return { Speed: 6, Weapon_Power: 25 + 7 * worldIndex, UQ1val: 30, AwesomeStats: 1 };
    }
    if (/^EquipmentRingsTempest[0-8]$/.test(item)) return { UQ1val: 25, AwesomeStats: 1 };
    throw new Error("Unknown Tempest equipment.");
}

/** Match Tempest town gates independently of whether the transformation is currently active. */
export function highestTempestDropWorld(attributes, lists, windwalker, item) {
    const bow = item.startsWith("EquipmentBowsTempest");
    const variant = Number(item.replace(bow ? "EquipmentBowsTempest" : "EquipmentRingsTempest", ""));
    const titans = Number(windwalker("TotalTitansKilled", 0, 0));
    if (!Number.isFinite(titans)) throw new Error("Tempest progression is unavailable.");
    let highestUnlocked = 0;
    // Native transformed world menu exposes W1-W6. W7 is not a Tempest drop world.
    for (let town = 0; town <= 200; town += 50) {
        const requirement = Number(windwalker("TitanKillReqTown", town, 0));
        const normalGate =
            Number(attributes.OptionsListAccount[387]) !== 1 || Number(attributes.KillsLeft2Advance[town][0]) < 1;
        if (titans >= requirement && normalGate) highestUnlocked = town / 50 + 1;
        else break;
    }
    let found = -1;
    lists.MapAFKtarget.forEach((main, map) => {
        const world = Math.floor(map / 50);
        if (world > highestUnlocked) return;
        const targets = [main, ...(lists.MapAFKtargetSide[map] || [])];
        for (const monster of targets) {
            if (attributes.MonsterDefinitionsGET.h[monster]?.h.AFKtype !== "FIGHTING") continue;
            const drop = attributes.CustomMaps.h.MonsterDrops.h[monster]?.[0];
            if (!drop || drop[0] !== "COIN") continue;
            const dropVariant = windwalker(bow ? "TempestWepDrop" : "TempestRingDrop", Number(drop[2]), 0);
            if (Number(dropVariant) === variant) found = Math.max(found, world);
        }
    });
    return found;
}

export function equippedSpecialRolls() {
    const rolls = {};
    const characterClass = Number(gga.CharacterClass);
    for (const slot of [1, 5, 7]) {
        const item = gga.EquipmentOrder[0][slot];
        if (characterClass === 40 && (item === "EquipmentWandsArc0" || item === "EquipmentRingsArc0")) {
            const quality = events(579)._customBlock_ArcaneType(
                item === "EquipmentWandsArc0" ? "WepDropQuality" : "RingDropQuality",
                0,
                0
            );
            rolls[item] = { stats: arcaneRoll(item, Number(quality)), stone: null };
        } else if (characterClass === 29 && /^Equipment(BowsTempest[0-4]|RingsTempest[0-8])$/.test(item)) {
            const windwalker = (...args) => events(579)._customBlock_Windwalker(...args);
            const world = highestTempestDropWorld(gga, cList, windwalker, item);
            if (world < 0) continue;
            rolls[item] = {
                stats: tempestRoll(item, world),
                stone: item.startsWith("EquipmentBows") ? "StoneTempestB2" : "StoneTempestR2",
            };
        }
    }
    return rolls;
}
