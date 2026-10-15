/**
 * ActorEvents_189 Proxies
 *
 * Proxies for ActorEvents_189 functions:
 * - AnvilProduceStats (anvil cost nullification, production speed)
 * - CauldronStats (alchemy cheats)
 * - chipBonuses (chip bonus modifications)
 * - MealBonus (meal bonus modifications)
 * - JellyOperation (Jelly Operator dispatch overrides)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { createMethodProxy, createConfigLookupProxy } from "../utils/proxy.js";
import { withStorageCapScope } from "./storageCap.js";

/**
 * Setup all ActorEvents_189 proxies.
 */
export function setupEvents189Proxies() {
    const ActorEvents189 = events(189);

    // Anvil production stats (cost nullification, production speed)
    createMethodProxy(ActorEvents189, "_customBlock_AnvilProduceStats", (base, key) => {
        if (cheatState.w1.anvil) {
            if (key === "Costs1" || key === "Costs2") return 0;
            if (key === "ProductionSpeed") return cheatConfig.w1.anvil.productionspeed(base);
        }
        return base;
    });

    const AnvilProduceStats = ActorEvents189._customBlock_AnvilProduceStats;
    ActorEvents189._customBlock_AnvilProduceStats = function (...args) {
        if (!cheatState.wide.storagecap || (args[0] !== "QuickDespositALL" && args[0] !== "QuickDespositALLautoALL")) {
            return Reflect.apply(AnvilProduceStats, this, args);
        }
        const sources =
            args[0] === "QuickDespositALL"
                ? [gga.AnvilPA]
                : Object.values(gga.PlayerDATABASE.h).map((player) => player.h.AnvilPA);
        return withStorageCapScope(() => Reflect.apply(AnvilProduceStats, this, args), {
            giveAtoms: () => false,
            setQuantity(target, key, value) {
                if (Number(value) !== 2e9 || Number(key) !== Number(gga.DNSM.h.AnvilPAqd2)) return value;
                // The base clears each source row after its quantity write and experience award.
                const production = Number(gga.DNSM.h.AnvilPAqd3);
                const source = sources.find((rows) => rows[production] && Number(rows[production][0]) > 0);
                const incoming = Number(source[production][0]);
                return Number.isFinite(incoming) ? Number(target[key]) + incoming : value;
            },
        });
    };

    // Cauldron stats (alchemy cheats)
    createConfigLookupProxy(ActorEvents189, "_customBlock_CauldronStats", [{ state: "w2.alchemy" }]);

    // Chip bonuses
    createConfigLookupProxy(ActorEvents189, "_customBlock_chipBonuses", [{ state: "w4.chipbonuses" }]);

    // Meal bonuses
    createConfigLookupProxy(ActorEvents189, "_customBlock_MealBonus", [{ state: "w4.meals" }]);

    // Jelly Operator dispatch; the original method must run before any configured override.
    createConfigLookupProxy(ActorEvents189, "_customBlock_JellyOperation", [{ state: "w7.jelly" }]);
}
