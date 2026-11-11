import { attireCatalog } from "./attireRack.js";

function attireSlots(player) {
    if (
        !Array.isArray(player?.EquipmentOrder?.[0]) ||
        player.EquipmentOrder[0].length < 16 ||
        !Array.isArray(player.EquipmentQuantity?.[0]) ||
        player.EquipmentQuantity[0].length < 16 ||
        !player.EquipmentMap?.[0]?.[15]?.h
    )
        return null;
    return { order: player.EquipmentOrder[0], quantity: player.EquipmentQuantity[0], map: player.EquipmentMap[0][15] };
}

export function characterAttire(attributes) {
    const active = attributes.UserInfo[0];
    return attributes.GetPlayersUsernames.filter((name) => typeof name === "string" && name.length).map((name) => {
        const player = name === active ? attributes : attributes.PlayerDATABASE.h[name]?.h;
        const slots = attireSlots(player);
        return { name, active: name === active, available: Boolean(slots), item: slots?.order[15] ?? "Blank" };
    });
}

/** Validate the entire batch before writing the single attire slot on each character. */
export function applyCharacterAttire(attributes, request, recalculate) {
    if (
        !request ||
        request.active !== attributes.UserInfo[0] ||
        !Array.isArray(request.changes) ||
        request.changes.length > attributes.GetPlayersUsernames.length
    )
        throw new Error("The active character or appearance request changed. Refresh before applying.");
    const valid = new Set(["Blank", ...attireCatalog(attributes.ItemDefinitionsGET.h).map(({ id }) => id)]);
    const seen = new Set();
    const writes = [];
    const changed = [];
    let activeChanged = false;
    const write = (target, key, after) => {
        if (!writes.some((entry) => entry.target === target && entry.key === key))
            writes.push({ target, key, before: target[key], after });
    };
    for (const change of request.changes) {
        if (
            !change ||
            typeof change.name !== "string" ||
            !attributes.GetPlayersUsernames.includes(change.name) ||
            seen.has(change.name) ||
            !valid.has(change.item)
        )
            throw new Error("Unknown character or attire. Nothing changed.");
        seen.add(change.name);
        const active = change.name === request.active;
        const saved = attributes.PlayerDATABASE.h[change.name]?.h;
        const slots = attireSlots(active ? attributes : saved);
        if (!slots || slots.order[15] !== change.before)
            throw new Error(
                `${change.name}'s attire changed or is unavailable. Refresh before applying. Nothing changed.`
            );
        if (change.item === change.before) continue;
        const targets = [active ? slots : null, saved ? attireSlots(saved) : null].filter(Boolean);
        if (!targets.length || (saved && !attireSlots(saved)))
            throw new Error("Saved equipment data is unavailable. Nothing changed.");
        for (const target of targets) {
            write(target.order, 15, change.item);
            write(target.quantity, 15, change.item === "Blank" ? 0 : 1);
            write(target.map, "h", {});
        }
        activeChanged ||= active;
        changed.push(change.name);
    }
    try {
        for (const entry of writes) entry.target[entry.key] = entry.after;
        if (activeChanged) recalculate();
    } catch (error) {
        for (const entry of writes.reverse()) entry.target[entry.key] = entry.before;
        if (activeChanged) {
            try {
                recalculate();
            } catch (rollbackError) {
                throw new Error(
                    `${error.message} Slots restored, but bonus recalculation failed: ${rollbackError.message}`
                );
            }
        }
        throw error;
    }
    return {
        changed,
        message: changed.length
            ? `Updated attire for ${changed.length} character${changed.length === 1 ? "" : "s"}.`
            : "No attire changes needed.",
    };
}
