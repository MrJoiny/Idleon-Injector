import { gga, events } from "../core/globals.js";
import { cheatConfig, cheatState } from "../core/state.js";
import { attireCatalog, configuredAttire } from "../helpers/attireRack.js";

const rackId = "AttireRackBonus";
const stats = ["Weapon_Power", "STR", "AGI", "WIS", "LUK", "Defence"];

export function setupAttireRackProxy() {
    const attributes = gga;
    const actor12 = events(12),
        actor345 = events(345),
        actor579 = events(579);
    let scope = null;
    let signature = null;
    let correctedCache = null;
    const corrected = new Set();
    const decorated = new WeakSet();
    for (const key of ["EquipmentOrder", "ItemDefinitionsGET"]) {
        let stored = attributes[key];
        Object.defineProperty(attributes, key, {
            enumerable: true,
            configurable: true,
            get() {
                if (!scope) return stored;
                if (key === "EquipmentOrder")
                    return new Proxy(stored, {
                        get(target, property, receiver) {
                            const base = Reflect.get(target, property, receiver);
                            return property === "0"
                                ? new Proxy(base, {
                                      get(row, slot, rowReceiver) {
                                          const item = Reflect.get(row, slot, rowReceiver);
                                          return slot === "15" && item === "Blank" ? rackId : item;
                                      },
                                  })
                                : base;
                        },
                    });
                return {
                    ...stored,
                    h: new Proxy(stored.h, {
                        get(target, id, receiver) {
                            const base = Reflect.get(target, id, receiver);
                            return id === scope.id ? { ...base, h: scope.definition } : base;
                        },
                    }),
                };
            },
            set(value) {
                stored = value;
            },
        });
    }

    const original = actor12._customBlock_TotalStats;
    actor12._customBlock_TotalStats = function (key, ...args) {
        const base = Reflect.apply(original, this, [key, ...args]);
        if (scope) return base;
        const definitions = attributes.ItemDefinitionsGET.h;
        const ids = cheatState.wide.attire ? configuredAttire(definitions, cheatConfig.wide.attire) : [];
        const equipped = attributes.EquipmentOrder[0][15];
        const dungeon = actor345._customBlock_Dungon() !== -1;
        const research = !dungeon && ids.length ? Number(actor579._customBlock_ResearchStuff("Grid_Bonus", 172, 0)) : 0;
        const nextSignature = JSON.stringify([attributes.UserInfo[0], equipped, ids, dungeon, research]);
        const changed = nextSignature !== signature;
        const extra = dungeon
            ? []
            : attireCatalog(Object.fromEntries(ids.filter((id) => id !== equipped).map((id) => [id, definitions[id]])));
        if (changed) {
            signature = nextSignature;
            attributes.DNSM.h.TotStatMAP.h = {};
        }
        const cache = attributes.DNSM.h.TotStatMAP.h;
        if (correctedCache !== cache) {
            correctedCache = cache;
            corrected.clear();
        }
        const decorate = () => {
            const map = attributes.DNSM.h.TotalStatsETCmap.h;
            if (decorated.has(map)) return;
            decorated.add(map);
            for (const item of extra)
                for (const bonus of item.bonuses)
                    map[bonus.key] =
                        (Number(map[bonus.key]) || 0) + bonus.value * (research >= 1 ? 1 + research / 100 : 1);
        };
        if (key === "calcEtcBonuses" && !changed) {
            decorate();
            return base;
        }
        if (!changed && (!extra.length || corrected.has(key))) return base;
        if (extra.length) {
            const definition = { ...definitions[equipped].h };
            for (const stat of stats)
                definition[stat] =
                    (Number(definition[stat]) || 0) + extra.reduce((sum, item) => sum + item.stats[stat], 0);
            scope = { id: equipped === "Blank" ? rackId : equipped, definition };
        }
        try {
            // The first call preserves native side effects. Refill only a stale or
            // uncorrected cache entry under the scoped equipment view; never replay a cache hit.
            if (changed) {
                delete cache.calcEtcBonuses;
                Reflect.apply(original, this, ["calcEtcBonuses"]);
                decorate();
            }
            if (key === "calcEtcBonuses") return base;
            delete cache[key];
            const result = Reflect.apply(original, this, [key, ...args]);
            corrected.add(key);
            return result;
        } catch (error) {
            attributes.DNSM.h.TotStatMAP.h = {};
            signature = null;
            throw error;
        } finally {
            scope = null;
        }
    };
}
