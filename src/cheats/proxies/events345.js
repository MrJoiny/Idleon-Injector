/**
 * ActorEvents_345 Proxies
 *
 * Proxies for ActorEvents_345 functions:
 * - WorkbenchStuff (flags, buildings, books, shrines, printer)
 * - Breeding (eggs, fence yard, battle slots, genetics, pets)
 * - Labb (lab connections, sigil speed)
 * - PetStuff (foraging, super pets)
 * - CookingR (meal speed, recipe speed, lucky chef, kitchens, plates)
 * - MainframeBonus (mainframe cheats)
 * - TowerStats (tower damage)
 * - Refinery (refinery speed)
 * - DungeonCalc (arcade cheats)
 * - 2inputs (worship mob death)
 * - keychainn (keychain stats)
 * - ShrineInfo (global shrines)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, events } from "../core/globals.js";

/**
 * Setup all ActorEvents_345 proxies.
 */
export function setupEvents345Proxies() {
    const ActorEvents345 = events(345);
    const getMultiplyValue = (key) => cheatConfig?.multiply?.[key] ?? 1;

    // Workbench stuff (W3 construction)
    const WorkbenchStuff = ActorEvents345._customBlock_WorkbenchStuff;
    ActorEvents345._customBlock_WorkbenchStuff = function (...args) {
        const key = args[0];

        // For minBookLv, modify args before calling base
        if (cheatState.w3.book && key === "minBookLv") {
            args[0] = "maxBookLv";
        }

        const base = Reflect.apply(WorkbenchStuff, this, args);

        if (cheatState.w3.flagreq && key === "FlagReq") return 0;
        if (cheatState.w3.freebuildings && (key === "TowerSaltCost" || key === "TowerMatCost")) return 0;
        if (cheatState.w3.instabuild && key === "TowerBuildReq") return 0;
        if (cheatState.w3.booktime && key === "BookReqTime") return 1;
        if (cheatState.w3.totalflags && key === "TotalFlags") return 10;
        if (cheatState.w3.buildspd && key === "PlayerBuildSpd") return cheatConfig.w3.buildspd(base);
        if (cheatState.multiply.printer && key === "ExtraPrinting") {
            args[0] = "AdditionExtraPrinting";
            const additionBase = Reflect.apply(WorkbenchStuff, this, args);
            return additionBase * getMultiplyValue("printer");
        }

        return base;
    };

    // Worship mob death
    const TwoInputs = ActorEvents345._customBlock_2inputs;
    ActorEvents345._customBlock_2inputs = function (...args) {
        const base = Reflect.apply(TwoInputs, this, args);
        if (cheatState.w3.mobdeath) return 0;
        return base;
    };

    // Global shrines
    // TODO: there is alreadya global shrine in the game new since a few release, change the code to just use the ingame one.
    // find out where and how it works ingame.
    const shrineInfo = bEngine.getGameAttribute("ShrineInfo");
    for (const i in shrineInfo) {
        if (typeof shrineInfo[i] === "object") {
            shrineInfo[i] = new Proxy(shrineInfo[i], {
                get(original, j) {
                    if (cheatState.w3.globalshrines && j === 0) {
                        return bEngine.getGameAttribute("CurrentMap");
                    }
                    return original[j];
                },
            });
        }
    }

    // Tower stats (tower damage)
    const TowerStats = ActorEvents345._customBlock_TowerStats;
    ActorEvents345._customBlock_TowerStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(TowerStats, this, args);
        if (cheatState.w3.towerdamage && key === "damage") {
            return cheatConfig.w3.towerdamage(base);
        }
        return base;
    };

    // Refinery speed
    if (ActorEvents345._customBlock_Refinery) {
        const Refinery = ActorEvents345._customBlock_Refinery;
        ActorEvents345._customBlock_Refinery = function (...args) {
            const key = args[0];
            const base = Reflect.apply(Refinery, this, args);
            if (cheatState.w3.refineryspeed && key === "CycleInitialTime") {
                return cheatConfig.w3.refineryspeed(base);
            }
            return base;
        };
    }

    // Breeding (W4)
    const Breeding = ActorEvents345._customBlock_Breeding;
    ActorEvents345._customBlock_Breeding = function (...args) {
        const key = args[0];

        // Special case: petrng needs to modify state before calling base
        if (cheatState.w4.petrng && key === "PetQTYonBreed") {
            cheatState.rng = "low";
            args[2] = 8;
            const base = Reflect.apply(Breeding, this, args);
            cheatState.rng = false;
            return Math.round(base * (1 + Math.random() * 0.2));
        }

        const base = Reflect.apply(Breeding, this, args);

        if (cheatState.w4.eggcap && key === "TotalEggCapacity") return 13;
        if (cheatState.w4.fenceyard && key === "FenceYardSlots") return 27;
        if (cheatState.w4.battleslots && key === "PetBattleSlots") return 6;
        if (cheatState.w4.petchance && key === "TotalBreedChance") return cheatConfig.w4.petchance(base);
        if (cheatState.w4.genes && key === "GeneticCost") return 0;
        if (cheatState.w4.fasteggs && key === "TotalTimeForEgg") return cheatConfig.w4.fasteggs(base);
        if (cheatState.w4.petupgrades && key === "PetUpgCostREAL") return cheatConfig.w4.petupgrades(base);

        return base;
    };

    // Lab (lab connections, sigil speed)
    const Labb = ActorEvents345._customBlock_Labb;
    ActorEvents345._customBlock_Labb = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Labb, this, args);
        if (cheatState.w4.labpx && (key === "Dist" || key === "BonusLineWidth")) return 1000;
        if (cheatState.w2.sigilspeed && key === "SigilBonusSpeed") {
            return cheatConfig.w2.alchemy.sigilspeed(base);
        }
        return base;
    };

    // Pet stuff (foraging, super pets)
    const PetStuff = ActorEvents345._customBlock_PetStuff;
    ActorEvents345._customBlock_PetStuff = function (...args) {
        const key = args[0];
        const base = Reflect.apply(PetStuff, this, args);
        if (cheatState.w4.fastforaging && key === "TotalTrekkingHR") {
            return cheatConfig.w4.fastforaging(base);
        }
        if (cheatState.w4.superpets && cheatConfig.w4.superpets[key]) {
            return cheatConfig.w4.superpets[key](base);
        }
        return base;
    };

    // Cooking (meal speed, recipe speed, lucky chef, kitchens, plates)
    const CookingR = ActorEvents345._customBlock_CookingR;
    ActorEvents345._customBlock_CookingR = function (...args) {
        const key = args[0];
        const base = Reflect.apply(CookingR, this, args);
        if (cheatState.w4.mealspeed && key === "CookingReqToCook") return cheatConfig.w4.mealspeed(base);
        if (cheatState.w4.recipespeed && key === "CookingFireREQ") return cheatConfig.w4.recipespeed(base);
        if (cheatState.w4.luckychef && key === "CookingLUCK") return cheatConfig.w4.luckychef(base);
        if (
            cheatState.w4.kitchensdiscount &&
            (key === "CookingNewKitchenCoinCost" || key === "CookingUpgSpiceCostQty")
        ) {
            return cheatConfig.w4.kitchensdiscount(base);
        }
        if (cheatState.w4.platesdiscount && key === "CookingMenuMealCosts") {
            return cheatConfig.w4.platesdiscount(base);
        }
        return base;
    };

    // Mainframe bonus
    const MainframeBonus = ActorEvents345._customBlock_MainframeBonus;
    ActorEvents345._customBlock_MainframeBonus = function (...args) {
        const key = args[0];
        const base = Reflect.apply(MainframeBonus, this, args);
        if (cheatState.w4.mainframe && key in cheatConfig.w4.mainframe) {
            return cheatConfig.w4.mainframe[key](base);
        }
        return base;
    };

    // Dungeon calc (arcade cheats)
    const DungeonCalc = ActorEvents345._customBlock_DungeonCalc;
    ActorEvents345._customBlock_DungeonCalc = function (...args) {
        const key = args[0];
        const base = Reflect.apply(DungeonCalc, this, args);
        if (cheatState.wide.arcade && key in cheatConfig.wide.arcade) {
            return cheatConfig.wide.arcade[key](base);
        }
        return base;
    };

    // Keychain stats
    // TODO: this cheat has no cheat attached to it. It always runs.
    const Keychainn = ActorEvents345._customBlock_keychainn;
    ActorEvents345._customBlock_keychainn = function (...args) {
        const base = Reflect.apply(Keychainn, this, args);
        if ("keychain" in cheatConfig.misc) {
            return cheatConfig.misc.keychain(base);
        }
        return base;
    };
}

/**
 * Initialize events345 proxies.
 */
export function initEvents345Proxies() {
    setupEvents345Proxies();
}
