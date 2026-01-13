/**
 * Keychain Stats Mapping
 *
 * Maps stat names to their keychain item data.
 * Format: [tier, itemId, statName, maxValue]
 * Used by the keychain cheat to generate perfect keychains.
 */
export const keychainStatsMap = {
    basedef: [1, "EquipmentKeychain0", "_BASE_DEFENCE", "5"],
    acc: [1, "EquipmentKeychain1", "_ACCURACY", "5"],
    movespd: [1, "EquipmentKeychain2", "%_MOVEMENT_SPEED", "2"],
    basedmg: [1, "EquipmentKeychain3", "_BASE_DAMAGE", "20"],
    carddr: [1, "EquipmentKeychain4", "%_CARD_DROP_CHANCE", "10"],
    money: [1, "EquipmentKeychain5", "%_MONEY", "10"],
    basestr: [1, "EquipmentKeychain6", "_STR", "6"],
    baseagi: [1, "EquipmentKeychain6", "_AGI", "6"],
    basewis: [1, "EquipmentKeychain7", "_WIS", "6"],
    baseluk: [1, "EquipmentKeychain7", "_LUK", "6"],
    pctdef1: [3, "EquipmentKeychain8", "%_DEFENCE", "4"],
    mining: [2, "EquipmentKeychain9", "%_MINING_XP_GAIN", "20"],
    totaldmg: [2, "EquipmentKeychain10", "%_TOTAL_DAMAGE", "3"],
    droprate: [2, "EquipmentKeychain11", "%_DROP_CHANCE", "8"],
    atkspd: [2, "EquipmentKeychain12", "%_BASIC_ATK_SPEED", "6"],
    crit: [2, "EquipmentKeychain13", "%_CRIT_CHANCE", "3"],
    fishing: [2, "EquipmentKeychain14", "%_FISHING_XP_GAIN", "20"],
    xp: [2, "EquipmentKeychain15", "%_XP_FROM_MONSTERS", "10"],
    mkill: [2, "EquipmentKeychain16", "%_MULTIKILL", "12"],
    pctdef2: [3, "EquipmentKeychain17", "%_DEFENCE", "8"],
    pctstr: [3, "EquipmentKeychain18", "%_STR", "6"],
    pctagi: [3, "EquipmentKeychain18", "%_AGI", "6"],
    afkgain: [3, "EquipmentKeychain19", "%_ALL_AFK_GAIN", "5"],
    pctdmg: [3, "EquipmentKeychain20", "%_TOTAL_DAMAGE", "7"],
    pctwis: [3, "EquipmentKeychain21", "%_WIS", "6"],
    pctluk: [3, "EquipmentKeychain21", "%_LUK", "6"],
    mobrsp: [3, "EquipmentKeychain22", "%_MOB_RESPAWN", "6"],
    skillspd: [3, "EquipmentKeychain23", "%_ALL_SKILL_SPEED", "2"],
    allstats: [3, "EquipmentKeychain24", "%_ALL_STATS", "4"],
};
