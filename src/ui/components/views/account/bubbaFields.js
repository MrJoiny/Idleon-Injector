const NO_FREE_LEVELS = new Set([3, 8, 9, 10, 12, 14, 15, 16]);
const PERMANENT = new Set([3, 8, 9]);

export const createBubbaSections = (upgrades, traits, gifts, smokeBonuses) => {
    if (
        upgrades.length !== 28 ||
        traits.length !== 6 ||
        gifts.length !== 6 ||
        smokeBonuses.length !== 5 ||
        upgrades.some((entry) => !entry[0] || !Number.isFinite(Number(entry[4])) || Number(entry[4]) < 0)
    ) {
        throw new Error("Unsupported Bubba definitions");
    }

    const field = (group, index, name, options = {}) => ({
        path: `Bubba[${group}][${index}]`,
        group,
        index,
        name,
        min: 0,
        max: Infinity,
        ...options,
    });
    const names = (values) =>
        values.map((name, index) => `${index + 1}: ${String(name).replace(/_/g, " ")}`).join(", ");
    const upgradeFields = (free) =>
        upgrades.map((entry, index) => {
            // The native purchase guard treats the metadata value 999 as unlimited.
            const max = free
                ? NO_FREE_LEVELS.has(index)
                    ? 0
                    : Infinity
                : Number(entry[4]) === 999
                  ? Infinity
                  : Number(entry[4]);
            return field(free ? 2 : 1, index, String(entry[0]).replace(/_/g, " "), {
                max,
                subLabel:
                    [
                        free && max === 0 ? "Does not receive free levels" : null,
                        !free && PERMANENT.has(index)
                            ? "Permanent progression. Setting this value does not reset the run."
                            : null,
                        Number.isFinite(max) && max > 0 ? `Maximum ${max}` : null,
                    ]
                        .filter(Boolean)
                        .join(" ") || null,
            });
        });

    return [
        {
            title: "RESOURCES & PROGRESS",
            fields: [
                field(0, 0, "Meat Slices", { formatted: true, float: true }),
                field(0, 1, "Happiness", { formatted: true, float: true }),
                field(0, 4, "Meat produced this run", { formatted: true, float: true }),
                field(0, 5, "Pats used this hour", { min: -50, subLabel: "Can be -50 after a Megaflesh milestone." }),
            ],
        },
        { title: "PURCHASED UPGRADES", fields: upgradeFields(false) },
        { title: "FREE UPGRADE LEVELS", fields: upgradeFields(true) },
        {
            title: "CHARISMA",
            note: "Unlocked by the Charisma upgrade. Emulsification requires 6 Megaflesh.",
            fields: [
                ...traits.map((name, index) =>
                    field(3, index, String(name).replace(/_/g, " "), { max: 120, subLabel: "Maximum 120" })
                ),
                field(0, 6, "Selected attribute", { max: 6, subLabel: `0: None, ${names(traits)}` }),
                field(0, 15, "Emulsified attribute", { max: 6, subLabel: `0: None, ${names(traits)}` }),
                field(0, 8, "Charisma progress", { formatted: true, float: true }),
            ],
        },
        {
            title: "GIFTS",
            note: "Fun Gifts unlocks gift choices. The second slot requires 3 Megaflesh.",
            fields: [2, 3].map((index) =>
                field(0, index, `Gift ${index - 1}`, { max: 6, subLabel: `0: None, ${names(gifts)}` })
            ),
        },
        {
            title: "DICE",
            note: "Unlocked by Dice Roll. More Dice and More Sides increase the available rolls.",
            fields: Array.from({ length: 8 }, (_, index) =>
                field(4, index, `Die ${index + 1}`, { max: 20, subLabel: "0: Inactive. Maximum roll 20." })
            ),
        },
        {
            title: "SMOKED MEAT",
            note: "Unlocked by Smoker.",
            fields: [
                ...smokeBonuses.map((bonus, index) =>
                    field(5, index, `Smoked Meat ${index + 1}`, { formatted: true, subLabel: `+${bonus}% per meat` })
                ),
                field(0, 14, "Smoker age (seconds)", { formatted: true, float: true }),
            ],
        },
        {
            title: "SPARE COINS",
            note: "Unlocked by Spare Coins.",
            fields: ["Pennies", "Nickels", "Quarters", "Dollars"].map((name, index) =>
                field(0, index + 9, name, { formatted: true })
            ),
        },
    ];
};
