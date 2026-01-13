/**
 * API Module Index
 *
 * Contains public API functions for external access:
 * - State accessors (OptionsListAccount, cheatState)
 * - Autocomplete suggestions
 */

// State accessors
export {
    getOptionsListAccount,
    setOptionsListAccountIndex,
    getOptionsListAccountIndex,
    cheatStateList,
} from "./stateAccessors.js";

// Suggestions for CLI/WebUI
export { getAutoCompleteSuggestions, getChoicesNeedingConfirmation } from "./suggestions.js";
