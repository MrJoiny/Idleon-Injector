import { cList, events, gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { settingsById } from "./engine.js";

/**
 * W4 meals. Each meal levels up with its own quantity (Meals[2][i]), up to one max level shared by all.
 * Food Lust stacks discount every meal cost, and any meal level-up spends them all, so while they are held
 * the priciest affordable meal buys first.
 */

const cooking = (...args) => events(345)._customBlock_CookingR(...args);
const maxLevel = () => cooking("CookingMealMaxLVlol", 0, 0);
const cost = (i) => cooking("CookingMenuMealCosts", i, 0);
// OLA[193] stacks, capped by Equinox Food Lust's level (Dream[11]), as CookingMenuMealCosts reads them.
const foodLust = () => Math.min(gga.OptionsListAccount[193], gga.Dream[11]);

// The meal menu's bonus line: { is the bonus, its "+" is drawn as "{" by the game's font only.
const bonus = (i) => {
    const info = cList.MealINFO[i];
    const level = gga.Meals[0][i];
    const value =
        info[5] === "PxLine"
            ? level * info[2]
            : cooking("CookingMealBonusMultioo", 0, 0) *
              events(579)._customBlock_Summoning2("BonusMultiCook", i, 0) *
              events(579)._customBlock_Summoning("RibbonBonus", gga.Ribbon[28 + i], 0) *
              level *
              info[2];
    const text =
        value < 1e7
            ? events(189)._customBlock_CommaNotation(value)
            : events(124)._customBlock_NotateNumber(value, "Big");
    return String(info[3]).split("{").join(text);
};

// The menu click buys inline (mouse-gated). These are its steps, minus the "j" menu art redraw.
function buy(i) {
    const price = cost(i);
    if (!(gga.Meals[2][i] >= price && gga.Meals[0][i] < maxLevel())) return;
    gga.Meals[2][i] -= price;
    gga.Meals[0][i] += 1;
    gga.OptionsListAccount[193] = 0;
    // MealBonus reads a cache that only this rebuilds.
    events(124)._customBlock_TalentCalc(-6);
    if (gga.QuestComplete.h.Oinkin1 === 0)
        gga.QuestStatus.h.Oinkin1[0] = gga.Meals[0].slice(0, 10).filter((level) => level >= 2).length;
    const level = gga.Meals[0][i];
    if (level >= 22) events(345)._customBlock_Reg_ach_add_status(233, 2);
    else if (level >= 16) events(345)._customBlock_Reg_ach_add_status(232, 2);
    else if (level >= 11) events(345)._customBlock_Reg_ach_add_status(231, 2);
    if (i === Number(cList.RANDOlist[63][gga.Tasks[1][3][1]]))
        events(266)._customBlock_TaskProgress(3, 1, "total", level);
}

function affordableMeals() {
    const settings = settingsById(cheatConfig.automation.meals.items);
    const max = maxLevel();
    return cList.MealINFO.flatMap((_, i) => {
        const entry = settings.get(String(i));
        const level = gga.Meals[0][i];
        if (!entry?.on || !(level > 0) || level >= Math.min(max, entry.stopAt ?? Infinity)) return [];
        const price = cost(i);
        return gga.Meals[2][i] >= price ? [{ id: i, cost: price }] : [];
    });
}

/** Meal rows and Food Lust stacks for the Account > Automation tab. */
export function getAutomationMeals() {
    return {
        foodLust: foodLust(),
        max: maxLevel(),
        meals: cList.MealINFO.map((info, i) => ({
            id: i,
            name: info[0],
            bonus: bonus(i),
            level: gga.Meals[0][i],
            owned: gga.Meals[2][i],
            cost: cost(i),
        })),
    };
}

export function runMeals() {
    if (!cheatConfig.automation.meals.items.some((entry) => entry.on)) return;
    // ponytail: cap per tick so a buy the game ignores can't spin forever; leftovers wait for the next tick.
    for (let n = 0; n < 100; n++) {
        const meals = affordableMeals();
        if (!meals.length) return;
        // Each meal pays with itself, so without stacks the order doesn't matter.
        const pick = foodLust() > 0 ? meals.reduce((best, meal) => (meal.cost > best.cost ? meal : best)) : meals[0];
        buy(pick.id);
    }
}
