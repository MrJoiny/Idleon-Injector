/**
 * ActorEvents_579 Proxies
 *
 * Proxies for ActorEvents_579 functions (W5/W6/W7 content):
 * - Summoning (owl, roo, endless, summoning, grimoire)
 * - Thingies (hoops/darts shop, zenith, clam, reef, coral kid, sneak symbol)
 * - Holes (W5 holes)
 * - Sailing (sailing cheats, ender captains)
 * - GamingStatType (gaming cheats)
 * - Divinity (divinity cheats)
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

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, events } from "../core/globals.js";

/**
 * Setup all ActorEvents_579 proxies.
 */
export function setupEvents579Proxies() {
    const ActorEvents579 = events(579);

    // Summoning (owl, roo, endless, summoning, grimoire)
    const Summoning = ActorEvents579._customBlock_Summoning;
    ActorEvents579._customBlock_Summoning = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Summoning, this, args);

        if (cheatState.w1.owl && cheatConfig.w1.owl[key]) {
            return cheatConfig.w1.owl[key](base);
        }
        if (cheatState.w2.roo && cheatConfig.w2.roo[key]) {
            return cheatConfig.w2.roo[key](base);
        }
        if (cheatState.w6.endless && key === "EndlessModifierID") {
            return 1;
        }
        if (cheatState.w6.summoning && cheatConfig.w6.summoning[key]) {
            return cheatConfig.w6.summoning[key](base);
        }
        if (cheatState.w6.grimoire && cheatConfig.w6.grimoire[key]) {
            return cheatConfig.w6.grimoire[key](base);
        }

        return base;
    };

    // Thingies (hoops shop, darts shop, zenith, clam, reef, coral kid, sneak symbol)
    const Thingies = ActorEvents579._customBlock_Thingies;
    ActorEvents579._customBlock_Thingies = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Thingies, this, args);

        if (cheatState.wide.hoopshop && cheatConfig.wide.hoopshop[key]) {
            return cheatConfig.wide.hoopshop[key](base);
        }
        if (cheatState.wide.dartshop && cheatConfig.wide.dartshop[key]) {
            return cheatConfig.wide.dartshop[key](base);
        }
        if (cheatState.w7.zenith && cheatConfig.w7.zenith[key]) {
            return cheatConfig.w7.zenith[key](base);
        }
        if (cheatState.w7.clam && cheatConfig.w7.clam[key]) {
            return cheatConfig.w7.clam[key](base);
        }
        if (cheatState.w7.reef && cheatConfig.w7.reef[key]) {
            return cheatConfig.w7.reef[key](base);
        }
        if (cheatState.w7.coralkid && cheatConfig.w7.coralkid[key]) {
            return cheatConfig.w7.coralkid[key](base);
        }
        if (cheatState.w6.sneaksymbol && cheatConfig.w6.sneaksymbol[key]) {
            return cheatConfig.w6.sneaksymbol[key](base);
        }

        return base;
    };

    // Holes (W5)
    const Holes = ActorEvents579._customBlock_Holes;
    ActorEvents579._customBlock_Holes = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Holes, this, args);
        if (cheatState.w5.holes && cheatConfig.w5.holes[key]) {
            return cheatConfig.w5.holes[key](base);
        }
        return base;
    };

    // Sailing (W5)
    const Sailing = ActorEvents579._customBlock_Sailing;
    ActorEvents579._customBlock_Sailing = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Sailing, this, args);

        if (cheatState.w5.sailing && cheatConfig.w5.sailing[key]) {
            return cheatConfig.w5.sailing[key](base);
        }

        if (cheatState.w5.endercaptains && key === "CaptainPedastalTypeGen") {
            const hasEmporiumBonus = this._customBlock_Ninja("EmporiumBonus", 32, 0) === 1;
            const hasRequiredLevel = Number(bEngine.getGameAttribute("Lv0")[13]) >= 50;
            if (hasEmporiumBonus && hasRequiredLevel) {
                bEngine.getGameAttribute("DNSM").h.SailzDN4 = 6;
                return 6;
            }
        }

        return base;
    };

    // Gaming (W5)
    const GamingStatType = ActorEvents579._customBlock_GamingStatType;
    ActorEvents579._customBlock_GamingStatType = function (...args) {
        const key = args[0];
        const base = Reflect.apply(GamingStatType, this, args);
        if (cheatState.w5.gaming && cheatConfig.w5.gaming[key]) {
            return cheatConfig.w5.gaming[key](base, args);
        }
        return base;
    };

    // Divinity (W5)
    const Divinity = ActorEvents579._customBlock_Divinity;
    ActorEvents579._customBlock_Divinity = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Divinity, this, args);
        if (cheatState.w5.divinity && cheatConfig.w5.divinity[key]) {
            return cheatConfig.w5.divinity[key](base);
        }
        return base;
    };

    // Atom collider (W5)
    const AtomCollider = ActorEvents579._customBlock_AtomCollider;
    ActorEvents579._customBlock_AtomCollider = function (...args) {
        const key = args[0];
        const base = Reflect.apply(AtomCollider, this, args);
        if (cheatState.w5.collider && cheatConfig.w5.collider[key]) {
            return cheatConfig.w5.collider[key](base);
        }
        return base;
    };

    // Dreamstuff (instant dreams - W3 talent)
    const Dreamstuff = ActorEvents579._customBlock_Dreamstuff;
    ActorEvents579._customBlock_Dreamstuff = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Dreamstuff, this, args);
        if (cheatState.w3.instantdreams && key === "BarFillReq") {
            return 0;
        }
        return base;
    };

    // Farming (W6)
    const FarmingStuffs = ActorEvents579._customBlock_FarmingStuffs;
    ActorEvents579._customBlock_FarmingStuffs = function (...args) {
        const key = args[0];
        const base = Reflect.apply(FarmingStuffs, this, args);
        if (cheatState.w6.farming && cheatConfig.w6.farming[key]) {
            return cheatConfig.w6.farming[key](base);
        }
        return base;
    };

    // Ninja (W6)
    const Ninja = ActorEvents579._customBlock_Ninja;
    ActorEvents579._customBlock_Ninja = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Ninja, this, args);
        if (cheatState.w6.ninja && cheatConfig.w6.ninja[key]) {
            return cheatConfig.w6.ninja[key](base);
        }
        return base;
    };

    // Windwalker (W6)
    const Windwalker = ActorEvents579._customBlock_Windwalker;
    ActorEvents579._customBlock_Windwalker = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Windwalker, this, args);
        if (cheatState.w6.windwalker && cheatConfig.w6.windwalker[key]) {
            return cheatConfig.w6.windwalker[key](base);
        }
        return base;
    };

    // Arcane (W6)
    const ArcaneType = ActorEvents579._customBlock_ArcaneType;
    ActorEvents579._customBlock_ArcaneType = function (...args) {
        const key = args[0];
        const base = Reflect.apply(ArcaneType, this, args);
        if (cheatState.w6.arcane && cheatConfig.w6.arcane[key]) {
            return cheatConfig.w6.arcane[key](base);
        }
        return base;
    };

    // Bubba (W7)
    const Bubbastuff = ActorEvents579._customBlock_Bubbastuff;
    ActorEvents579._customBlock_Bubbastuff = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Bubbastuff, this, args);
        if (cheatState.w7.bubba && cheatConfig.w7.bubba[key]) {
            return cheatConfig.w7.bubba[key](base);
        }
        return base;
    };

    // Spelunk (W7 spelunk, big fish)
    const Spelunk = ActorEvents579._customBlock_Spelunk;
    ActorEvents579._customBlock_Spelunk = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Spelunk, this, args);
        if (cheatState.w7.spelunk && cheatConfig.w7.spelunk[key]) {
            return cheatConfig.w7.spelunk[key](base);
        }
        if (cheatState.w7.bigfish && cheatConfig.w7.bigfish[key]) {
            return cheatConfig.w7.bigfish[key](base);
        }
        return base;
    };

    // Gallery (W7)
    const Gallery = ActorEvents579._customBlock_Gallery;
    ActorEvents579._customBlock_Gallery = function (...args) {
        const key = args[0];
        const base = Reflect.apply(Gallery, this, args);
        if (cheatState.w7.gallery && cheatConfig.w7.gallery[key]) {
            return cheatConfig.w7.gallery[key](base);
        }
        return base;
    };
}
