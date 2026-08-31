/**
 * Bundles Helper
 *
 * Functions for working with gem shop bundles.
 */

import { gameContext, gga } from "../core/globals.js";
import { knownBundles } from "../constants.js";

const getBundleMessages = () => {
    return gameContext["scripts.CustomMapsREAL"].GemPopupBundleMessages().h || {};
};

/**
 * Get all available bundles, merging known bundles with game data.
 *
 * @returns {Array<[string, string]>} Array of [displayName, bundleCode] tuples
 */
export function getAllBundles() {
    const bundleMessages = getBundleMessages();
    const allBundles = [...knownBundles];

    for (const [key] of Object.entries(bundleMessages)) {
        if (key === "Blank") continue;
        if (!allBundles.some((bundle) => bundle[1] === key)) {
            allBundles.push(["Unknown", key]);
        }
    }

    return allBundles;
}
/**
 * Return the current bundle catalog with live ownership flags.
 *
 * The page intentionally displays only manually named entries from knownBundles.
 * Live discovery remains available through getAllBundles() for autocomplete.
 * Ownership is intentionally read-only here: buying is handled by the existing
 * game/Firebase cheat flow.
 *
 * @returns {Array<{ code: string, name: string, owned: 0 | 1 }>}
 */
export function getBundleCatalog() {
    const bundlesReceived = gga.BundlesReceived.h;

    return knownBundles.map(([name, code]) => ({
        code,
        name,
        owned: Number(bundlesReceived[code]) === 1 ? 1 : 0,
    }));
}
