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
import { createMethodProxy } from "../utils/methodProxy.js";

/**
 * Setup all ActorEvents_579 proxies.
 */
export function setupEvents579Proxies() {
    const ActorEvents579 = events(579);

    // Summoning (owl, roo, endless, summoning, grimoire)
    createMethodProxy(ActorEvents579, "_customBlock_Summoning", (base, key) => {
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
    });

    // Thingies (hoops shop, darts shop, zenith, clam, reef, coral kid, sneak symbol)
    createMethodProxy(ActorEvents579, "_customBlock_Thingies", (base, key) => {
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
    });

    // Holes (W5)
    createMethodProxy(ActorEvents579, "_customBlock_Holes", (base, key) => {
        if (cheatState.w5.holes && cheatConfig.w5.holes[key]) {
            return cheatConfig.w5.holes[key](base);
        }
        return base;
    });

    // Sailing (W5)
    createMethodProxy(ActorEvents579, "_customBlock_Sailing", (base, key) => {
        if (cheatState.w5.sailing && cheatConfig.w5.sailing[key]) {
            return cheatConfig.w5.sailing[key](base);
        }

        if (cheatState.w5.endercaptains && key === "CaptainPedastalTypeGen") {
            // Note: 'this' context is preserved by createMethodProxy
            // But we need to be careful if 'this' relies on specific scope
            // ActorEvents579 prototypes usually use 'this' as the instance
            const hasEmporiumBonus = this._customBlock_Ninja("EmporiumBonus", 32, 0) === 1;
            const hasRequiredLevel = Number(bEngine.getGameAttribute("Lv0")[13]) >= 50;
            if (hasEmporiumBonus && hasRequiredLevel) {
                bEngine.getGameAttribute("DNSM").h.SailzDN4 = 6;
                return 6;
            }
        }
        return base;
    });

    // Gaming (W5)
    createMethodProxy(ActorEvents579, "_customBlock_GamingStatType", (base, ...args) => {
        const key = args[0];
        if (cheatState.w5.gaming && cheatConfig.w5.gaming[key]) {
            return cheatConfig.w5.gaming[key](base, args);
        }
        return base;
    });

    // Divinity (W5)
    createMethodProxy(ActorEvents579, "_customBlock_Divinity", (base, key) => {
        if (cheatState.w5.divinity && cheatConfig.w5.divinity[key]) {
            return cheatConfig.w5.divinity[key](base);
        }
        return base;
    });

    // Atom collider (W5)
    createMethodProxy(ActorEvents579, "_customBlock_AtomCollider", (base, key) => {
        if (cheatState.w5.collider && cheatConfig.w5.collider[key]) {
            return cheatConfig.w5.collider[key](base);
        }
        return base;
    });

    // Dreamstuff (instant dreams - W3 talent)
    createMethodProxy(ActorEvents579, "_customBlock_Dreamstuff", (base, key) => {
        if (cheatState.w3.instantdreams && key === "BarFillReq") {
            return 0;
        }
        return base;
    });

    // Farming (W6)
    createMethodProxy(ActorEvents579, "_customBlock_FarmingStuffs", (base, key) => {
        if (cheatState.w6.farming && cheatConfig.w6.farming[key]) {
            return cheatConfig.w6.farming[key](base);
        }
        return base;
    });

    // Ninja (W6)
    createMethodProxy(ActorEvents579, "_customBlock_Ninja", (base, key) => {
        if (cheatState.w6.ninja && cheatConfig.w6.ninja[key]) {
            return cheatConfig.w6.ninja[key](base);
        }
        return base;
    });

    // Windwalker (W6)
    createMethodProxy(ActorEvents579, "_customBlock_Windwalker", (base, key) => {
        if (cheatState.w6.windwalker && cheatConfig.w6.windwalker[key]) {
            return cheatConfig.w6.windwalker[key](base);
        }
        return base;
    });

    // Arcane (W6)
    createMethodProxy(ActorEvents579, "_customBlock_ArcaneType", (base, key) => {
        if (cheatState.w6.arcane && cheatConfig.w6.arcane[key]) {
            return cheatConfig.w6.arcane[key](base);
        }
        return base;
    });

    // Bubba (W7)
    createMethodProxy(ActorEvents579, "_customBlock_Bubbastuff", (base, key) => {
        if (cheatState.w7.bubba && cheatConfig.w7.bubba[key]) {
            return cheatConfig.w7.bubba[key](base);
        }
        return base;
    });

    // Spelunk (W7 spelunk, big fish)
    createMethodProxy(ActorEvents579, "_customBlock_Spelunk", (base, key) => {
        if (cheatState.w7.spelunk && cheatConfig.w7.spelunk[key]) {
            return cheatConfig.w7.spelunk[key](base);
        }
        if (cheatState.w7.bigfish && cheatConfig.w7.bigfish[key]) {
            return cheatConfig.w7.bigfish[key](base);
        }
        return base;
    });

    // Gallery (W7)
    createMethodProxy(ActorEvents579, "_customBlock_Gallery", (base, key) => {
        if (cheatState.w7.gallery && cheatConfig.w7.gallery[key]) {
            return cheatConfig.w7.gallery[key](base);
        }
        return base;
    });
}
