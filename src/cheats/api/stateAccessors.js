/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - Unified path-based read/write (readPath, writePath)
 * - Selective object-entry reads for large maps (readEntries)
 * - Small computed-value bridge for internal helper families
 * - cheatState access
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
export { readPath, readPaths, readEntries, deletePath, writePath, writePaths } from "../utils/pathResolver.js";

const COMPUTED_SOURCES = {
    workbench: { eventId: 345, method: "_customBlock_WorkbenchStuff" },
    breeding: { eventId: 345, method: "_customBlock_Breeding" },
    alchemy: { eventId: 189, method: "_customBlock_cauldronp2wbonuses" },
    summoning: { eventId: 579, method: "_customBlock_Summoning" },
    cookingMastery: { eventId: 579, method: "_customBlock_Summoning2" },
    atomCollider: { eventId: 579, method: "_customBlock_AtomCollider" },
    runCode: { eventId: 12, method: "_customBlock_RunCodeOfTypeXforThingY" },
    runCodeType: { eventId: 12, method: "_customBlock_RunCodeOfType" },
    dream: { eventId: 579, method: "_customBlock_Dreamstuff" },
    skillStats: { eventId: 12, method: "_customBlock_SkillStats" },
    thingies: { eventId: 579, method: "_customBlock_Thingies" },
    minehead: { eventId: 579, method: "_customBlock_Minehead" },
    farming: { eventId: 579, method: "_customBlock_FarmingStuffs" },
};

export function getcheatStateList() {
    return cheatState;
}

/**
 * Read a computed value from a game helper family.
 * Uses the same injected ActorEvents access pattern as the minigame cheats:
 * events(345), events(579), etc. The UI never touches ActorEvents directly.
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array=} args
 * @returns {{ value: any } | { error: string }}
 */
export function readComputed(namespace, name, args = []) {
    if (!namespace || typeof namespace !== "string") return { error: "Missing or invalid namespace" };
    if (!name || typeof name !== "string") return { error: "Missing or invalid name" };
    if (!Array.isArray(args)) return { error: "args must be an array" };

    const source = COMPUTED_SOURCES[namespace];
    if (!source) return { error: `Unsupported computed namespace: ${namespace}` };
    if (typeof events !== "function") return { error: "ActorEvents bridge unavailable" };

    try {
        const actorEvents = events(source.eventId);
        const fn = actorEvents?.[source.method];
        if (typeof fn !== "function") {
            return { error: `Computed helper unavailable: ${namespace}.${name}` };
        }
        return { value: Reflect.apply(fn, actorEvents, [name, ...args]) };
    } catch (e) {
        return { error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
    }
}

/**
 * Read many computed values from one game helper family.
 * Resolves ActorEvents and helper once, then preserves per-item failures.
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array[]=} argSets
 * @returns {{ value: Array<{ ok: boolean, value?: any, error?: string }> } | { error: string }}
 */
export function readComputedMany(namespace, name, argSets = []) {
    if (!namespace || typeof namespace !== "string") return { error: "Missing or invalid namespace" };
    if (!name || typeof name !== "string") return { error: "Missing or invalid name" };
    if (!Array.isArray(argSets)) return { error: "argSets must be an array" };
    if (!argSets.every(Array.isArray)) return { error: "argSets must contain arrays" };

    const source = COMPUTED_SOURCES[namespace];
    if (!source) return { error: `Unsupported computed namespace: ${namespace}` };
    if (typeof events !== "function") return { error: "ActorEvents bridge unavailable" };

    try {
        const actorEvents = events(source.eventId);
        const fn = actorEvents?.[source.method];
        if (typeof fn !== "function") {
            return { error: `Computed helper unavailable: ${namespace}.${name}` };
        }

        const value = argSets.map((args) => {
            try {
                return { ok: true, value: Reflect.apply(fn, actorEvents, [name, ...args]) };
            } catch (e) {
                return { ok: false, error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
            }
        });

        return { value };
    } catch (e) {
        return { error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
    }
}
