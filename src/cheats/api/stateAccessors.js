/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - OptionsListAccount access
 * - cheatState access
 */

import { bEngine } from "../core/globals.js";
import { cheatState } from "../core/state.js";

export function getOLA() {
    return bEngine?.gameAttributes?.h?.OptionsListAccount ?? null;
}

export function setOLAIndex(index, value) {
    const ola = getOLA();
    if (ola) {
        ola[index] = value;
        return ola[index];
    }
    return null;
}

export function getOLAIndex(index) {
    return getOLA()?.[index] ?? null;
}

export function getcheatStateList() {
    return cheatState;
}
