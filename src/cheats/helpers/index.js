/**
 * Helpers Module
 *
 * Export all helper functions for use throughout the cheats system.
 */

import { dropOnChar, setCheatConfig as setDropOnCharConfig } from "./dropOnChar.js";
import {
    rollAllObols,
    rollPersonalObols,
    rollFamilyObols,
    rollAllCharactersObols,
    rollInventoryObols,
    rollPerfectObols,
    setCheatConfig as setObolConfig,
} from "./obolRolling.js";

/**
 * Initialize all helpers with the cheat config.
 * @param {object} config - The cheatConfig object
 */
export function initHelpers(config) {
    setDropOnCharConfig(config);
    setObolConfig(config);
}

// Re-export everything
export { dropOnChar, setDropOnCharConfig };
export {
    rollAllObols,
    rollPersonalObols,
    rollFamilyObols,
    rollAllCharactersObols,
    rollInventoryObols,
    rollPerfectObols,
    setObolConfig,
};
