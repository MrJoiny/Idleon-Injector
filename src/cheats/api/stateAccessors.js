/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - OptionsListAccount access
 * - cheatState access
 */

import { gga } from "../core/globals.js";
import { cheatState } from "../core/state.js";

export function getOLA() {
    return gga.OptionsListAccount;
}

export function setOLAIndex(index, value) {
    const ola = getOLA();
    ola[index] = value;
    return ola[index];
}

export function getOLAIndex(index) {
    return getOLA()[index];
}

export function getcheatStateList() {
    return cheatState;
}
