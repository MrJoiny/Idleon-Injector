/**
 * GGA Blacklist
 *
 * Set of game attribute keys to skip when scanning for NaN values.
 * These attributes contain complex objects that shouldn't be traversed.
 */
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
