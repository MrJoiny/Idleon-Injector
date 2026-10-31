/** IDs verified against item definitions and the Rare Drops template. Keep and Blank are distinct. */
export const wardrobePresets = [
    {
        id: "rare-drops",
        name: "Rare Drops",
        description: "Rare drop farming · DK / Royal Guard primarily; available to all base classes.",
        classes: ["Beginner", "Warrior", "Archer", "Mage"],
        weapons: {
            Beginner: "EquipmentPunching7",
            Warrior: "EquipmentSword5",
            Archer: "EquipmentBows10",
            Mage: "EquipmentWands9",
        },
        equipment: [
            "EquipmentHats123",
            "Weapon",
            "EquipmentShirts36",
            "EquipmentPendant30",
            "EquipmentPants27",
            "EquipmentRings35",
            "EquipmentShoes41",
            "EquipmentRings35",
            "Keep",
            "EquipmentKeychain22",
            "Keep",
            "EquipmentKeychain22",
            "EquipmentCape18",
            "EquipmentRingsChat11",
            "Keep",
            "EquipmentGown9",
        ],
        tools: [
            "EquipmentTools15",
            "EquipmentToolsHatchet10",
            "FishingRod12",
            "CatchingNet12",
            "TrapBoxSet11",
            "WorshipSkull12",
            "Blank",
        ],
        food: ["FoodG2", "FoodG9", "FoodG12", "FoodG13", "FoodG8", "Blank"],
        chips: [21, 20, 18, 17, 15, 16, 10],
        cards: ["w7b7", "babaMummy", "w7b9", "wolfB", "w6d2", "Boss6A", "mini6a", "w7a12"],
        cardSet: 7,
        prayers: [4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        obols: { Circle: "ObolHyper0", Square: "ObolHyperB0", Hexagon: "ObolLava", Sparkle: "ObolKruk" },
    },
];
export function wardrobeClass(classId) {
    if (!Number.isInteger(classId) || classId < 0 || classId > 40) throw new Error("Unsupported character class.");
    return classId < 7 ? "Beginner" : classId < 19 ? "Warrior" : classId < 31 ? "Archer" : "Mage";
}
