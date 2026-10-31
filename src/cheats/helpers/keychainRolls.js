/** Explicit Wardrobe preferences, stored as modifiers. Fixed Spiritlord stats stay in definitions. */
export function keychainRoll(item, primaryStat) {
    const roll = (text, first, second = first) => ({ UQ1txt: text, UQ1val: first, UQ2txt: text, UQ2val: second });
    if (item === "EquipmentKeychain11") return roll("%_DROP_CHANCE", 15, 10);
    if (item === "EquipmentKeychain22") return roll("%_MOB_RESPAWN", 6);
    if (item === "EquipmentKeychain19") return roll("%_ALL_AFK_GAIN", 5);
    if (item === "EquipmentKeychain16") return roll("%_MULTIKILL", 12);
    if (item === "EquipmentKeychain18" && ["STR", "AGI"].includes(primaryStat)) return roll("%_" + primaryStat, 6);
    if (item === "EquipmentKeychain29") return {};
    throw new Error("No preferred keychain rolls are configured for this class and item.");
}
