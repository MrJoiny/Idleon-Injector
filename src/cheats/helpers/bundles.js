/**
 * Bundles Helper
 *
 * Functions for working with gem shop bundles.
 */

import { gameContext } from "../core/globals.js";
import { knownBundles } from "../constants.js";

/**
 * Get all available bundles, merging known bundles with game data.
 *
 * @returns {Array<[string, string]>} Array of [displayName, bundleCode] tuples
 */
export function getAllBundles() {
    const bundleMessages = gameContext["scripts.CustomMapsREAL"].GemPopupBundleMessages().h || {};
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
 * Get a map from bundle code to display name.
 *
 * @returns {Map<string, string>} Map of bundleCode -> displayName
 */
export function getBundleCodeToNameMap() {
    return new Map(getAllBundles().map(([name, code]) => [code, name]));
}
