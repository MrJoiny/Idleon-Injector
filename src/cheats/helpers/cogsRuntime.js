import { events, gga } from "../core/globals.js";
import { deepCopy } from "../utils/deepCopy.js";

export const getWorkbenchBehavior481 = () => {
    const wbActor = gga?.PixelHelperActor?.[8];
    const direct = wbActor?.behaviors?.getBehavior?.("ActorEvents_481");
    if (direct && typeof direct._customEvent_WorkbenchStuff2 === "function") return direct;

    const list = wbActor?.behaviors?.behaviors;
    if (!list) return null;
    const entries = Array.isArray(list) ? list : Object.values(list);
    for (const behavior of entries) {
        if (behavior?.name === "ActorEvents_481" && behavior?.script?._customEvent_WorkbenchStuff2) {
            return behavior.script;
        }
        if (behavior?.script?._customEvent_WorkbenchStuff2) {
            return behavior.script;
        }
    }
    return null;
};

export function spawnCogRuntime({ jeweled = false, lane = 0 } = {}) {
    const workbenchFns = events(345);
    if (!workbenchFns || typeof workbenchFns._customBlock_WorkbenchStuff !== "function") {
        throw new Error("Workbench formula event 345 was not found.");
    }

    const cogSlots = Number(workbenchFns._customBlock_WorkbenchStuff("CogSlots", 0, 0)) || 0;
    if (cogSlots <= 0) {
        throw new Error("No cog storage slots are available.");
    }

    let freeSlot = -1;
    for (let i = 0; i < cogSlots; i++) {
        if (gga?.CogOrder?.[108 + i] === "Blank") {
            freeSlot = 108 + i;
            break;
        }
    }

    if (freeSlot === -1) {
        throw new Error("No free normal cog inventory slot was found.");
    }

    if (jeweled) {
        const candidates = [];
        const ranges = [
            [0, 95],
            [108, 227],
        ];

        for (const [start, end] of ranges) {
            for (let i = start; i <= end; i++) {
                const id = gga?.CogOrder?.[i];
                if (typeof id !== "string" || id === "Blank") continue;
                if (id.startsWith("Player_")) continue;
                if (id.startsWith("CogSm")) continue;
                if (!id.startsWith("CogCry")) continue;

                candidates.push({
                    slot: i,
                    id,
                    map: gga?.CogMap?.[i],
                });
            }
        }

        if (!candidates.length) {
            throw new Error("No existing CogCry jeweled cogs were found to clone from.");
        }

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const clonedMap = deepCopy(pick.map) ?? {};
        if (!clonedMap.h || typeof clonedMap.h !== "object") clonedMap.h = {};

        gga.CogOrder[freeSlot] = pick.id;
        gga.CogMap[freeSlot] = clonedMap;

        return {
            jeweled: true,
            lane: null,
            slot: freeSlot,
            id: gga?.CogOrder?.[freeSlot],
            fromSlot: pick.slot,
            cogMap: deepCopy(gga?.CogMap?.[freeSlot]),
        };
    }

    lane = Math.max(0, Math.min(3, Number(lane) || 0));

    const wb = getWorkbenchBehavior481();
    if (!wb || typeof wb._customEvent_WorkbenchStuff2 !== "function") {
        throw new Error("ActorEvents_481 was not found on PixelHelperActor[8].");
    }

    gga.TowerInfo[62 + lane] = 1_000_000;
    wb._dummynumber3 = freeSlot;
    wb._TRIGGEREDtext = `k${lane}`;
    wb._customEvent_WorkbenchStuff2();

    const spawnedId = gga?.CogOrder?.[freeSlot];
    if (typeof spawnedId !== "string" || spawnedId === "Blank") {
        throw new Error("Normal spawn path did not create a cog. Open Construction > Cogs in-game and try again.");
    }

    return {
        jeweled: false,
        lane,
        slot: freeSlot,
        id: spawnedId,
        cogMap: deepCopy(gga?.CogMap?.[freeSlot]),
        towerInfo: gga?.TowerInfo?.[62 + lane],
    };
}

export function setTinyCogRuntime(slot, type, tier) {
    const targetSlot = Math.round(Number(slot));
    if (!Number.isFinite(targetSlot) || targetSlot < 228 || targetSlot > 251) {
        throw new Error("Tiny cog slot must be in CogOrder[228..251].");
    }

    const normalizedType = String(type ?? "").trim();
    if (!["_", "a", "b"].includes(normalizedType)) {
        throw new Error('Tiny cog type must be "_", "a", or "b".');
    }

    const normalizedTier = Math.max(0, Math.min(9, Number(tier) || 0));
    const id = `CogSm${normalizedType}${normalizedTier}`;

    if (!gga?.CogOrder || !gga?.CogMap) {
        throw new Error("CogOrder/CogMap storage is unavailable.");
    }

    gga.CogOrder[targetSlot] = id;
    if (!gga.CogMap[targetSlot] || typeof gga.CogMap[targetSlot] !== "object") {
        gga.CogMap[targetSlot] = { h: {} };
    }
    if (!gga.CogMap[targetSlot].h || typeof gga.CogMap[targetSlot].h !== "object") {
        gga.CogMap[targetSlot].h = {};
    }

    return {
        slot: targetSlot,
        id,
        type: normalizedType,
        tier: normalizedTier,
        cogMap: deepCopy(gga.CogMap[targetSlot]) ?? { h: {} },
    };
}
