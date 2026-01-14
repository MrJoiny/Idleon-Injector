/**
 * Firebase Proxy
 *
 * Intercepts the playButton function to re-initialize proxies
 * when returning from character selection screen.
 */

import { registerCommonVariables } from "../core/globals.js";
import { setupCListProxy } from "./clist.js";
import { setupQuestProxy } from "./misc.js";

// Store reference to full proxy setup (set externally to avoid circular dependency)
let fullProxySetupFn = null;

/**
 * Set the full proxy setup function reference.
 * @param {Function} fn
 */
export function setFullProxySetup(fn) {
    fullProxySetupFn = fn;
}

/**
 * Setup Firebase proxy to handle character selection screen.
 *
 * When player returns from character selection, some game data is reloaded.
 * This proxy catches that and re-initializes the necessary proxies.
 *
 * @param {object} context - The game context
 */
export function setupFirebaseProxy(context) {
    if (context.FirebaseStorage && context.FirebaseStorage.playButton) {
        context.FirebaseStorage.playButton = new Proxy(context.FirebaseStorage.playButton, {
            apply: (target, thisArg, argumentsList) => {
                const result = Reflect.apply(target, thisArg, argumentsList);

                // Register common variables again
                registerCommonVariables(context);

                // Re-apply proxies that get reset
                try {
                    setupCListProxy();
                    setupQuestProxy(context);
                } catch (e) {
                    console.error("Error re-applying proxies after character selection:", e);
                }

                return result;
            },
        });
    }
}
