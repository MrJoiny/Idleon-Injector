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
import { events, gga } from "../core/globals.js";
import { createMethodProxy, createConfigLookupProxy } from "../utils/proxy.js";

/**
 * Setup all ActorEvents_579 proxies.
 */
export function setupEvents579Proxies() {
    const ActorEvents579 = events(579);

    createConfigLookupProxy(ActorEvents579, "_customBlock_Summoning", [
        { state: "w1.owl" },
        { state: "w2.roo" },
        { state: "w6.endless", fixedKey: "EndlessModifierID", value: 1 },
        { state: "w6.summoning" },
        { state: "w6.sumunit" },
        { state: "w6.grimoire" },
    ]);

    createConfigLookupProxy(ActorEvents579, "_customBlock_Thingies", [
        { state: "wide.hoopshop" },
        { state: "wide.dartshop" },
        { state: "w7.zenith" },
        { state: "w7.clam" },
        { state: "w7.reef" },
        { state: "w7.coralkid" },
        { state: "w6.sneaksymbol" },
    ]);

    // Holes (W5)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Holes", [{ state: "w5.holes" }]);

    // Sailing (W5)
    // Kept manual due to complex side-effects and context usage in endercaptains
    createMethodProxy(ActorEvents579, "_customBlock_Sailing", function (base, key) {
        if (cheatState.w5.sailing && cheatConfig.w5.sailing[key]) {
            return cheatConfig.w5.sailing[key](base);
        }

        if (cheatState.w5.endercaptains && key === "CaptainPedastalTypeGen") {
            const hasEmporiumBonus = this._customBlock_Ninja("EmporiumBonus", 32, 0) === 1;
            const hasRequiredLevel = Number(gga.Lv0[13]) >= 50;
            if (hasEmporiumBonus && hasRequiredLevel) {
                gga.DNSM.h.SailzDN4 = 6;
                return 6;
            }
        }
        return base;
    });

    // Gaming (W5)
    createConfigLookupProxy(ActorEvents579, "_customBlock_GamingStatType", [{ state: "w5.gaming" }]);

    // Divinity (W5)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Divinity", [{ state: "w5.divinity" }]);

    // Atom collider (W5)
    createConfigLookupProxy(ActorEvents579, "_customBlock_AtomCollider", [{ state: "w5.collider" }]);

    // Dreamstuff (instant dreams - W3 talent)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Dreamstuff", [
        { state: "w3.instantdreams", fixedKey: "BarFillReq", value: 0 },
    ]);

    // Talent enhancement (plunderous mob spawn rate)
    createMethodProxy(ActorEvents579, "_customBlock_TalentEnh", (base, key) => {
        if (cheatState.wide.plunderous && key === 318) return 100;
        return base;
    });

    // Farming (W6)
    createConfigLookupProxy(ActorEvents579, "_customBlock_FarmingStuffs", [{ state: "w6.farming" }]);

    // Ninja (W6)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Ninja", [{ state: "w6.ninja" }]);

    // Windwalker (W6)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Windwalker", [{ state: "w6.windwalker" }]);

    // Arcane (W6)
    createConfigLookupProxy(ActorEvents579, "_customBlock_ArcaneType", [{ state: "w6.arcane" }]);

    // Bubba (W7)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Bubbastuff", [{ state: "w7.bubba" }]);

    // Minehead & Glimbo (W7)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Minehead", [
        { state: "w7.minehead" },
        { state: "w7.glimbo" },
    ]);

    // Research (W7)
    createConfigLookupProxy(ActorEvents579, "_customBlock_ResearchStuff", [{ state: "w7.research" }]);

    // Spelunk (W7 spelunk, big fish, spelunkmana)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Spelunk", [
        { state: "w7.spelunk" },
        { state: "w7.bigfish" },
        { state: "w7.spelunkmana" },
    ]);

    // Gallery (W7)
    createConfigLookupProxy(ActorEvents579, "_customBlock_Gallery", [{ state: "w7.gallery" }]);
}
