// Attire stays in its real slot. Only synchronous native stat reads see this view.
const rackId = "AttireRackBonus";
const stats = ["Weapon_Power", "STR", "AGI", "WIS", "LUK", "Defence"];

export function attireCatalog(definitions) {
    return Object.entries(definitions)
        .filter(([id, { h: d }]) => /^EquipmentGown\d+$/.test(id) && id !== "EquipmentGown0" && d.typeGen === "aGown")
        .map(([id, { h: d }]) => ({
            id,
            name: d.displayName.replace(/[_|]/g, " "),
            stats: Object.fromEntries(stats.map((key) => [key, Number(d[key]) || 0])),
            bonuses: [1, 2]
                .filter((n) => d[`UQ${n}txt`] !== "0" && Number(d[`UQ${n}val`]))
                .map((n) => ({
                    key: d[`UQ${n}txt`],
                    value: Number(d[`UQ${n}val`]),
                })),
        }));
}

/** Reuse the native formulas, including rounding, talent multipliers and special classes. */
export function installAttireRack(attributes, actor12, actor345, actor579, selection) {
    let scope = null;
    let signature = null;
    let refreshing = false;
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
        // All native calls execute, even with the rack disabled or in a dungeon.
        const previous = scope;
        const wasRefreshing = refreshing;
        scope = null;
        const ids = [...new Set(selection())].sort();
        const equipped = attributes.EquipmentOrder[0][15];
        const definitions = attributes.ItemDefinitionsGET.h;
        const extra = attireCatalog(
            Object.fromEntries(
                ids.filter((id) => id !== equipped && definitions[id]).map((id) => [id, definitions[id]])
            )
        );
        const dungeon = actor345._customBlock_Dungon() !== -1;
        const research =
            !dungeon && extra.length ? Number(actor579._customBlock_ResearchStuff("Grid_Bonus", 172, 0)) : 0;
        const nextSignature = JSON.stringify([attributes.UserInfo[0], equipped, ids, dungeon, research]);
        if (!dungeon && extra.length) {
            const definition = { ...definitions[equipped].h };
            for (const stat of stats)
                definition[stat] =
                    (Number(definition[stat]) || 0) + extra.reduce((sum, item) => sum + item.stats[stat], 0);
            scope = { id: equipped === "Blank" ? rackId : equipped, definition };
        }
        const invoke = (requested) => {
            const base = Reflect.apply(original, this, [requested, ...args]);
            if (requested === "calcEtcBonuses" && !dungeon && extra.length) {
                const map = attributes.DNSM.h.TotalStatsETCmap.h;
                if (!decorated.has(map)) {
                    for (const item of extra)
                        for (const bonus of item.bonuses) {
                            map[bonus.key] =
                                (Number(map[bonus.key]) || 0) + bonus.value * (research >= 1 ? 1 + research / 100 : 1);
                        }
                    decorated.add(map);
                }
            }
            return base;
        };
        try {
            let base = invoke(key);
            if (!refreshing && signature !== nextSignature) {
                refreshing = true;
                signature = nextSignature;
                attributes.DNSM.h.TotStatMAP.h = {};
                invoke("calcEtcBonuses");
                base = key === "calcEtcBonuses" ? 0 : invoke(key);
            }
            return base;
        } finally {
            scope = previous;
            refreshing = wasRefreshing;
        }
    };
}
