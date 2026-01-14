/**
 * ActorEvents_579 Proxies
 *
 * Proxies for ActorEvents_579 functions (W5/W6/W7 content):
 * - Summoning (owl, roo, endless, summoning, grimoire)
 * - Thingies (hoops/darts shop, zenith, clam, reef, coral kid, sneak symbol)
 * - Holes (W5 holes)
 * - Sailing (sailing cheats, ender captains)
 * - GamingStatType (gaming cheats, snail mail)
 * - Divinity (divinity cheats, unlinks)
 * - AtomCollider (collider cheats)
 * - Dreamstuff (instant dreams)
 * - FarmingStuffs (W6 farming)
 * - Ninja (ninja cheats)
 * - Windwalker (windwalker cheats)
 * - ArcaneType (arcane cheats)
 * - Bubbastuff (W7 bubba)
 * - Spelunk (spelunk, big fish)
 * - Gallery (gallery cheats)
 */

import { cheatState } from "../core/state.js";
import { bEngine, CList, events } from "../core/globals.js";
import { chainProxies, createConfigProxy } from "../utils/proxyHelpers.js";
import { getConfig, setConfig } from "./proxyContext.js";

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    setConfig(config);
}

// Helper to create state getter for nested paths like "w1.owl"
const state = (world, key) => () => cheatState[world]?.[key];
const config = (world, key) => () => getConfig()?.[world]?.[key];

/**
 * Setup summoning proxy (owl, roo, endless, summoning, grimoire).
 * Note: Multiple cheats share the same function, so they're chained.
 */
export function setupSummoningProxies() {
    const actorEvents579 = events(579);

    chainProxies(actorEvents579, "_customBlock_Summoning", [
        // Owl cheats (W1)
        { stateGetter: state("w1", "owl"), configGetter: config("w1", "owl") },
        // Roo cheats (W2)
        { stateGetter: state("w2", "roo"), configGetter: config("w2", "roo") },
        // Endless cheats (W6) - custom handler
        {
            stateGetter: state("w6", "endless"),
            handler: (args) => (args[0] === "EndlessModifierID" ? 1 : undefined),
        },
        // Summoning cheats (W6)
        { stateGetter: state("w6", "summoning"), configGetter: config("w6", "summoning") },
        // Grimoire cheats (W6)
        { stateGetter: state("w6", "grimoire"), configGetter: config("w6", "grimoire") },
    ]);
}

/**
 * Setup thingies proxy (hoops shop, darts shop, zenith, clam, reef, coral kid, sneak symbol).
 */
export function setupThingiesProxies() {
    const actorEvents579 = events(579);

    chainProxies(actorEvents579, "_customBlock_Thingies", [
        // Hoops shop
        { stateGetter: state("wide", "hoopshop"), configGetter: config("wide", "hoopshop") },
        // Darts shop
        { stateGetter: state("wide", "dartshop"), configGetter: config("wide", "dartshop") },
        // Zenith (W7)
        { stateGetter: state("w7", "zenith"), configGetter: config("w7", "zenith") },
        // Clam (W7)
        { stateGetter: state("w7", "clam"), configGetter: config("w7", "clam") },
        // Reef (W7)
        { stateGetter: state("w7", "reef"), configGetter: config("w7", "reef") },
        // Coral kid (W7)
        { stateGetter: state("w7", "coralkid"), configGetter: config("w7", "coralkid") },
        // Sneak symbol (W6)
        { stateGetter: state("w6", "sneaksymbol"), configGetter: config("w6", "sneaksymbol") },
    ]);
}

/**
 * Setup holes proxy (W5).
 */
export function setupHolesProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_Holes", state("w5", "holes"), config("w5", "holes"));
}

/**
 * Setup sailing proxy (W5).
 */
export function setupSailingProxy() {
    const actorEvents579 = events(579);
    const cheatConfig = getConfig();

    const Sailing = actorEvents579._customBlock_Sailing;
    actorEvents579._customBlock_Sailing = function (...argumentsList) {
        const res = Reflect.apply(Sailing, this, argumentsList);
        if (cheatState.w5.sailing && cheatConfig?.w5?.sailing?.hasOwnProperty(argumentsList[0]))
            return cheatConfig.w5.sailing[argumentsList[0]](res);
        if (cheatState.w5.endercaptains && "CaptainPedastalTypeGen" == argumentsList[0]) {
            if (
                1 == this._customBlock_Ninja("EmporiumBonus", 32, 0) &&
                50 <= Number(bEngine.getGameAttribute("Lv0")[13])
            ) {
                const dnsm = bEngine.getGameAttribute("DNSM");
                dnsm.h.SailzDN4 = 6;
                return 6;
            }
        }
        return res;
    };
}

/**
 * Setup gaming proxy (W5).
 */
export function setupGamingProxy() {
    const actorEvents579 = events(579);
    const cheatConfig = getConfig();

    const GamingStatType = actorEvents579._customBlock_GamingStatType;
    actorEvents579._customBlock_GamingStatType = function (...argumentsList) {
        if (cheatState.w5.gaming && cheatConfig?.w5?.gaming?.[argumentsList[0]]) {
            return cheatConfig.w5.gaming[argumentsList[0]](
                Reflect.apply(GamingStatType, this, argumentsList),
                argumentsList
            );
        }
        return Reflect.apply(GamingStatType, this, argumentsList);
    };

    // Snail mail attribute proxy
    const GamingAttr = bEngine.getGameAttribute("Gaming");
    GamingAttr._13 = GamingAttr[13];
    Object.defineProperty(bEngine.getGameAttribute("Gaming"), 13, {
        get: function () {
            return cheatState.w5.gaming && cheatConfig?.w5?.gaming?.SnailMail
                ? cheatConfig.w5.gaming.SnailMail
                : GamingAttr._13;
        },
        set: function (value) {
            GamingAttr._13 = value;
            return true;
        },
    });
}

/**
 * Setup divinity proxy (W5).
 */
export function setupDivinityProxy() {
    const actorEvents579 = events(579);
    const cheatConfig = getConfig();

    const Divinity = actorEvents579._customBlock_Divinity;
    actorEvents579._customBlock_Divinity = function (...argumentsList) {
        if (cheatState.w5.divinity && cheatConfig?.w5?.divinity?.[argumentsList[0]]) {
            return cheatConfig.w5.divinity[argumentsList[0]](Reflect.apply(Divinity, this, argumentsList));
        }
        return Reflect.apply(Divinity, this, argumentsList);
    };

    // Divinity unlinks attribute proxy
    const DivinityAttr = bEngine.getGameAttribute("Divinity");
    DivinityAttr._38 = DivinityAttr[38];
    Object.defineProperty(DivinityAttr, 38, {
        get: function () {
            return cheatState.w5.divinity && cheatConfig?.w5?.divinity?.unlinks ? 1 : this._38;
        },
        set: function (value) {
            this._38 = value;
            return true;
        },
    });
}

/**
 * Setup atom collider proxy (W5).
 */
export function setupAtomColliderProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_AtomCollider", state("w5", "collider"), config("w5", "collider"));
}

/**
 * Setup rift attribute proxy (W5).
 */
export function setupRiftProxy() {
    const RiftAttr = bEngine.getGameAttribute("Rift");
    RiftAttr._1 = RiftAttr[1];
    Object.defineProperty(bEngine.getGameAttribute("Rift"), 1, {
        get: function () {
            return cheatState.unlock.rifts && CList.RiftStuff[4][bEngine.getGameAttribute("Rift")[0]] != 9
                ? 1e8
                : RiftAttr._1;
        },
        set: function (value) {
            RiftAttr._1 = value;
            return true;
        },
    });
}

/**
 * Setup dreamstuff proxy (instant dreams - W3 talent).
 */
export function setupDreamstuffProxy() {
    const actorEvents579 = events(579);

    chainProxies(actorEvents579, "_customBlock_Dreamstuff", [
        {
            stateGetter: state("w3", "instantdreams"),
            handler: (args) => (args[0] === "BarFillReq" ? 0 : undefined),
        },
    ]);
}

/**
 * Setup farming proxy (W6).
 */
export function setupFarmingProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_FarmingStuffs", state("w6", "farming"), config("w6", "farming"));
}

/**
 * Setup ninja proxy (W6).
 */
export function setupNinjaProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_Ninja", state("w6", "ninja"), config("w6", "ninja"));
}

/**
 * Setup windwalker proxy (W6).
 */
export function setupWindwalkerProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_Windwalker", state("w6", "windwalker"), config("w6", "windwalker"));
}

/**
 * Setup arcane proxy (W6).
 */
export function setupArcaneProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_ArcaneType", state("w6", "arcane"), config("w6", "arcane"));
}

/**
 * Setup bubba proxy (W7).
 */
export function setupBubbaProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_Bubbastuff", state("w7", "bubba"), config("w7", "bubba"));
}

/**
 * Setup spelunk proxy (W7 spelunk, big fish).
 */
export function setupSpelunkProxy() {
    const actorEvents579 = events(579);

    chainProxies(actorEvents579, "_customBlock_Spelunk", [
        // Spelunk cheats
        { stateGetter: state("w7", "spelunk"), configGetter: config("w7", "spelunk") },
        // Big fish shares Spelunk function
        { stateGetter: state("w7", "bigfish"), configGetter: config("w7", "bigfish") },
    ]);
}

/**
 * Setup gallery proxy (W7).
 */
export function setupGalleryProxy() {
    const actorEvents579 = events(579);
    createConfigProxy(actorEvents579, "_customBlock_Gallery", state("w7", "gallery"), config("w7", "gallery"));
}

/**
 * Setup all ActorEvents_579 proxies.
 */
export function setupEvents579Proxies() {
    setupSummoningProxies();
    setupThingiesProxies();
    setupHolesProxy();
    setupSailingProxy();
    setupGamingProxy();
    setupDivinityProxy();
    setupAtomColliderProxy();
    setupRiftProxy();
    setupDreamstuffProxy();
    setupFarmingProxy();
    setupNinjaProxy();
    setupWindwalkerProxy();
    setupArcaneProxy();
    setupBubbaProxy();
    setupSpelunkProxy();
    setupGalleryProxy();
}

/**
 * Initialize events579 proxies with config.
 * @param {object} config - The cheat config object
 */
export function initEvents579Proxies(config) {
    setCheatConfig(config);
    setupEvents579Proxies();
}
