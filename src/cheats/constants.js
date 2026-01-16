/**
 * Cheat Constants
 *
 * Consolidated constants used across the cheats module.
 */

// TODO: this is not accurate anymore, needs some changing!
// Alchemy type indices for CauldronInfo attribute
export const alchemyTypes = {
    orangebubbles: 0,
    greenbubbles: 1,
    purplebubbles: 2,
    yellowbubbles: 3,
    vials: 4,
    color: 5,
    liquids: 6,
    cauldrons: 8,
};

// Summon unit name to ID mapping for W6 summoning system
export const summonUnits = {
    vrumbi: 4,
    bloomy: 3,
    tonka: 5,
    regalis: 2,
    basic: 0,
    sparkie: 1,
    guardio: 6,
    muddah: 7,
    reset: -1,
};

// Keychain stats mapping: [tier, itemId, statName, maxValue]
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

// Item types safe to auto-loot straight into chest
export const lootableItemTypes = [
    "ORE",
    "BAR",
    "LOG",
    "LEAF",
    "FISH",
    "BUG",
    "CRITTER",
    "SOUL",
    "SPELUNKY_PAGE",
    "KITCHEN_LADLE",
    "PET_EGG",
    "MATERIAL",
    "MONSTER_DROP",
    "BOSS_KEY",
    "FISHING_ACCESSORY",
    "FRAGMENT",
    "TELEPORT",
    "TALENT_POINT",
    "OFFICE_PEN",
    "TELEPORTER",
    "STATUE",
    "UPGRADE",
    "TIME_CANDY",
    "HEALTH_FOOD",
    "BOOST_FOOD",
    "GOLDEN_FOOD",
    "USABLE",
    "TICKET",
    "EXP_BALLOON",
    "EVENT_WISH",
    "RESET_POTION",
    "CARD",
    "FISTICUFF", // Coins
    "GEM",
    "EVENT_BOX",
    "QUEST_ITEM",
];

// Game attribute keys to skip when scanning for NaN values
export const blacklist_gga = new Set([
    "Player",
    "DummyNumbersStatManager",
    "PixelHelperActor",
    "OriginPixelActor",
    "OtherPlayers",
    "PlayerImgInst",
    "_rawCustomLists",
    "CustomLists",
    "ItemDefinitionsGET",
    "MonsterDefinitionsGET",
    "DialogueDefGET",
    "MapMonstersList",
    "dummyActor",
]);

// Known gem shop bundles: [displayName, bundleCode]
export const knownBundles = [
    ["Lava Supporter Pack", "bun_a"],
    ["New Year Supporter Pack", "bun_b"],
    ["Starter Pack", "bun_c"],
    ["Easter Bundle", "bun_d"],
    ["Totally Chill Pack", "bun_e"],
    ["Summer Bundle", "bun_f"],
    ["Dungeon Bundle", "bun_g"],
    ["Giftmas Bundle", "bun_h"],
    ["Auto Loot Pack", "bun_i"],
    ["Outta This World Pack", "bun_j"],
    ["Eggscellent Pack", "bun_k"],
    ["Super Hot Fire Pack", "bun_l"],
    ["Gem Motherlode Pack", "bun_m"],
    ["Riftwalker Pack", "bun_n"],
    ["Bloomin Pet Pack", "bun_o"],
    ["Island Explorer Pack", "bun_p"],
    ["Equinox Dreamer Pack", "bun_q"],
    ["Calm Serenity Pack", "bun_r"],
    ["Sacred Methods Pack", "bun_s"],
    ["Timeless Pack", "bun_t"],
    ["Ancient Echoes Pack", "bun_u"],
    ["Deathbringer Pack", "bun_v"],
    ["Windwalker Pack", "bun_w"],
    ["Arcande Cultist Pack", "bun_x"],
    ["Valenslime Day Pack", "bun_y"],
    ["Fallen Spirits Pet Pack", "bun_z"],
    ["Storage Ram Pack", "bon_a"],
    ["Blazing Star Anniversary Pack", "bon_c"],
    ["Midnight Tide Anniversary Pack", "bon_d"],
    ["Lush Emerald Anniversary Pack", "bon_e"],
    ["Eternal Hunter Pack", "bon_f"],
    ["Gilded Treasure Pack", "bon_g"],
    ["World 7 Pack", "bon_i"],
    ["Squirell Pack", "bon_h"],
    ["Mr.Piggy Pack", "bon_j"],
    ["Autumn Pack", "bon_k"],
    ["Bubba! Pack", "bon_l"],
    ["Bunny Pack", "bon_m"],
    ["Hedgehog Pack", "bon_n"],
    ["Panda Pack", "bon_o"],
    ["Santa helper bundle", "bon_p"],
];

// Target cards to boost for godlike card cheat
export const TARGET_CARDS = ["Boss2A", "Boss2B", "poopBig", "OakTree", "Copper"];

