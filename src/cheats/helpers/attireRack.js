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

export function configuredAttire(definitions, config) {
    const catalog = attireCatalog(definitions);
    const choice = config?.outfits ?? "all";
    if (choice === "all") return catalog.map(({ id }) => id);
    if (typeof choice !== "string") throw new Error("Attire outfits must be all or comma-separated item IDs.");
    const ids = [
        ...new Set(
            choice
                .split(",")
                .map((id) => id.trim())
                .filter(Boolean)
        ),
    ];
    if (ids.some((id) => !catalog.some((item) => item.id === id))) throw new Error("Unknown attire in Config.");
    return ids;
}
