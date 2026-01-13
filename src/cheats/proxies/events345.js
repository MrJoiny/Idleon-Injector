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

import { cheatState } from "../core/state.js";
import { bEngine, events } from "../core/globals.js";
import { getConfig, setConfig } from "./proxyContext.js";

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    setConfig(config);
}

/**
 * Setup workbench stuff proxy (W3 construction).
 */
export function setupWorkbenchStuffProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const Workbench = actorEvents345._customBlock_WorkbenchStuff;
    actorEvents345._customBlock_WorkbenchStuff = function (...argumentsList) {
        const t = argumentsList[0];
        if (cheatState.w3.flagreq && t == "FlagReq") return 0; // Nullified flag unlock time
        if (cheatState.w3.freebuildings && (t == "TowerSaltCost" || t == "TowerMatCost")) return 0; // Tower cost nullification
        if (cheatState.w3.instabuild && t == "TowerBuildReq") return 0; // Instant build/upgrade
        if (cheatState.w3.booktime && t == "BookReqTime") return 1; // Book/second
        if (cheatState.w3.totalflags && t == "TotalFlags") return 10; // Total amount of placeable flags
        if (cheatState.w3.buildspd && t == "PlayerBuildSpd") {
            // multiply build rate
            const originalValue = Reflect.apply(Workbench, this, argumentsList);
            return cheatConfig.w3.buildspd(originalValue);
        }
        if (cheatState.multiply.printer && t == "ExtraPrinting")
            return (
                (argumentsList[0] = "AdditionExtraPrinting"),
                cheatConfig.multiply.printer * Reflect.apply(Workbench, this, argumentsList)
            ); // print multiplier
        // The minimum level talent book from the library is equivalent to the max level
        if (cheatState.w3.book && t == "minBookLv") {
            argumentsList[0] = "maxBookLv";
        }
        return Reflect.apply(Workbench, this, argumentsList);
    };
}

/**
 * Setup worship mob death proxy.
 */
export function setupWorshipMobDeathProxy() {
    const actorEvents345 = events(345);

    actorEvents345._customBlock_2inputs = new Proxy(actorEvents345._customBlock_2inputs, {
        apply: function (originalFn, context, argumentsList) {
            if (cheatState.w3.mobdeath) return "Worshipmobdeathi" == true ? 0 : 0;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup global shrines proxy.
 */
export function setupShrineInfoProxy() {
    const shrineInfo = bEngine.getGameAttribute("ShrineInfo");
    for (const i in shrineInfo) {
        if (typeof shrineInfo[i] == "object") {
            shrineInfo[i] = new Proxy(shrineInfo[i], {
                get: function (original, j) {
                    return cheatState.w3.globalshrines && j == 0 ? bEngine.getGameAttribute("CurrentMap") : original[j];
                },
            });
        }
    }
}

/**
 * Setup tower stats proxy (tower damage).
 */
export function setupTowerStatsProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    actorEvents345._customBlock_TowerStats = new Proxy(actorEvents345._customBlock_TowerStats, {
        apply: function (originalFn, context, argumentList) {
            const stat = argumentList[0];
            const base = Reflect.apply(originalFn, context, argumentList);

            if (cheatState.w3.towerdamage && stat === "damage") {
                return cheatConfig.w3.towerdamage(base);
            }
            return base;
        },
    });
}

/**
 * Setup refinery proxy (refinery speed).
 */
export function setupRefineryProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    if (actorEvents345._customBlock_Refinery) {
        const Refinery = actorEvents345._customBlock_Refinery;
        actorEvents345._customBlock_Refinery = function (...argumentsList) {
            const key = argumentsList[0];

            if (cheatState.w3.refineryspeed && key === "CycleInitialTime") {
                const baseTime = Reflect.apply(Refinery, this, argumentsList);
                return cheatConfig.w3.refineryspeed(baseTime);
            }

            return Reflect.apply(Refinery, this, argumentsList);
        };
    }
}

/**
 * Setup breeding proxy (W4 breeding).
 */
export function setupBreedingProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    actorEvents345._customBlock_Breeding = new Proxy(actorEvents345._customBlock_Breeding, {
        apply: function (originalFn, context, argumentsList) {
            const t = argumentsList[0];

            if (cheatState.w4.eggcap && t == "TotalEggCapacity") return 13; // 13 eggs
            if (cheatState.w4.fenceyard && t == "FenceYardSlots") return 27; // 27 fenceyard slots
            if (cheatState.w4.battleslots && t == "PetBattleSlots") return 6; // 6 battle slots
            if (cheatState.w4.petchance && t == "TotalBreedChance")
                return cheatConfig.w4.petchance(Reflect.apply(originalFn, context, argumentsList));
            if (cheatState.w4.genes && t == "GeneticCost") return 0; // 0 gene upgrades
            if (cheatState.w4.fasteggs && t == "TotalTimeForEgg")
                return cheatConfig.w4.fasteggs(Reflect.apply(originalFn, context, argumentsList));
            if (cheatState.w4.petupgrades && t == "PetUpgCostREAL")
                return cheatConfig.w4.petupgrades(Reflect.apply(originalFn, context, argumentsList));
            if (cheatState.w4.petrng && t == "PetQTYonBreed") {
                cheatState.rng = "low";
                argumentsList[2] = 8;
                const power = Reflect.apply(originalFn, context, argumentsList);
                cheatState.rng = false;
                return Math.round(power * (1 + Math.random() * 0.2));
            }
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup lab proxy (lab connections, sigil speed).
 */
export function setupLabProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const Lab = actorEvents345._customBlock_Labb;
    actorEvents345._customBlock_Labb = function (...argumentsList) {
        const t = argumentsList[0];
        if (cheatState.w4.labpx && (t == "Dist" || t == "BonusLineWidth")) return 1000; // long lab connections
        if (cheatState.w2.sigilspeed && t == "SigilBonusSpeed")
            return cheatConfig.w2.alchemy.sigilspeed(Reflect.apply(Lab, this, argumentsList));
        return Reflect.apply(Lab, this, argumentsList);
    };
}

/**
 * Setup pet stuff proxy (foraging, super pets).
 */
export function setupPetStuffProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const PetStuff = actorEvents345._customBlock_PetStuff;
    actorEvents345._customBlock_PetStuff = function (...argumentsList) {
        const originalValue = Reflect.apply(PetStuff, this, argumentsList);
        if (cheatState.w4.fastforaging && argumentsList[0] == "TotalTrekkingHR")
            return cheatConfig.w4.fastforaging(originalValue); // fast foraging
        if (cheatState.w4.superpets && cheatConfig.w4.superpets[argumentsList[0]])
            return cheatConfig.w4.superpets[argumentsList[0]](originalValue); // powerful pets
        return originalValue;
    };
}

/**
 * Setup cooking proxy (meal speed, recipe speed, lucky chef, kitchens, plates).
 */
export function setupCookingProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const CookingR = actorEvents345._customBlock_CookingR;
    actorEvents345._customBlock_CookingR = function (...argumentsList) {
        const t = argumentsList[0];
        if (cheatState.w4.mealspeed && t == "CookingReqToCook")
            return cheatConfig.w4.mealspeed(Reflect.apply(CookingR, this, argumentsList));
        if (cheatState.w4.recipespeed && t == "CookingFireREQ")
            return cheatConfig.w4.recipespeed(Reflect.apply(CookingR, this, argumentsList));
        if (cheatState.w4.luckychef && t == "CookingLUCK")
            return cheatConfig.w4.luckychef(Reflect.apply(CookingR, this, argumentsList));
        if (cheatState.w4.kitchensdiscount && (t == "CookingNewKitchenCoinCost" || t == "CookingUpgSpiceCostQty"))
            return cheatConfig.w4.kitchensdiscount(Reflect.apply(CookingR, this, argumentsList));
        if (cheatState.w4.platesdiscount && t == "CookingMenuMealCosts")
            return cheatConfig.w4.platesdiscount(Reflect.apply(CookingR, this, argumentsList));
        return Reflect.apply(CookingR, this, argumentsList);
    };
}

/**
 * Setup mainframe bonus proxy.
 */
export function setupMainframeBonusProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const MainframeBonus = actorEvents345._customBlock_MainframeBonus;
    actorEvents345._customBlock_MainframeBonus = function (...argumentsList) {
        if (cheatState.w4.mainframe && cheatConfig.w4.mainframe.hasOwnProperty(argumentsList[0])) {
            return cheatConfig.w4.mainframe[argumentsList[0]](Reflect.apply(MainframeBonus, this, argumentsList));
        }
        return Reflect.apply(MainframeBonus, this, argumentsList);
    };
}

/**
 * Setup dungeon calc proxy (arcade cheats).
 */
export function setupDungeonCalcProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const DungeonCalc = actorEvents345._customBlock_DungeonCalc;
    actorEvents345._customBlock_DungeonCalc = function (...argumentList) {
        return cheatState.wide.arcade && cheatConfig.wide.arcade.hasOwnProperty(argumentList[0])
            ? cheatConfig.wide.arcade[argumentList[0]](Reflect.apply(DungeonCalc, this, argumentList))
            : Reflect.apply(DungeonCalc, this, argumentList);
    };
}

/**
 * Setup keychain proxy.
 */
export function setupKeychainProxy() {
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    const keychain = actorEvents345._customBlock_keychainn;
    actorEvents345._customBlock_keychainn = function (...argumentList) {
        return cheatConfig.misc.hasOwnProperty("keychain")
            ? cheatConfig.misc["keychain"](Reflect.apply(keychain, this, argumentList))
            : Reflect.apply(keychain, this, argumentList);
    };
}

/**
 * Setup all ActorEvents_345 proxies.
 */
export function setupEvents345Proxies() {
    setupWorkbenchStuffProxy();
    setupWorshipMobDeathProxy();
    setupShrineInfoProxy();
    setupTowerStatsProxy();
    setupRefineryProxy();
    setupBreedingProxy();
    setupLabProxy();
    setupPetStuffProxy();
    setupCookingProxy();
    setupMainframeBonusProxy();
    setupDungeonCalcProxy();
    setupKeychainProxy();
}

/**
 * Initialize events345 proxies with config.
 * @param {object} config - The cheat config object
 */
export function initEvents345Proxies(config) {
    setCheatConfig(config);
    setupEvents345Proxies();
}
