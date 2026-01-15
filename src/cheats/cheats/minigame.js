/**
 * Minigame Cheats
 *
 * Cheats for minigame manipulation:
 * - Mining, Fishing, Catching, Choppin, Poing
 * - Hoops, Darts, Wisdom Monument, Scratch
 */

import { registerCheats } from "../core/registration.js";
import { cheatState } from "../core/state.js";
import {
    setupMiningFishingProxies,
    setupCatchingMinigameProxy,
    setupChoppingMinigameProxy,
    setupPoingMinigameProxy,
    setupHoopsDartsProxies,
    setupWisdomMonumentProxy,
    setupScratchMinigameProxy,
} from "../proxies/minigames.js";

/**
 * Mapping of minigame names to their setup functions.
 * Only the relevant proxy is called when a minigame cheat is toggled.
 */
const minigameSetupMap = {
    mining: setupMiningFishingProxies,
    fishing: setupMiningFishingProxies,
    catching: setupCatchingMinigameProxy,
    choppin: setupChoppingMinigameProxy,
    poing: setupPoingMinigameProxy,
    hoops: setupHoopsDartsProxies,
    darts: setupHoopsDartsProxies,
    wisdom: setupWisdomMonumentProxy,
    scratch: setupScratchMinigameProxy,
};

/**
 * Generic minigame cheat toggle function.
 * Only sets up the specific minigame proxy that's being toggled.
 * @param {string[]} params - The cheat parameters
 * @returns {string} Result message
 */
function minigameCheat(params) {
    const minigameName = params[0];
    const setupFn = minigameSetupMap[minigameName];

    // Only setup the specific minigame proxy needed
    if (setupFn) {
        setupFn();
    }

    cheatState.minigame[minigameName] = !cheatState.minigame[minigameName];
    return `${cheatState.minigame[minigameName] ? "Activated" : "Deactivated"} ${minigameName} minigame cheat.`;
}

// Register minigame cheats
registerCheats({
    name: "minigame",
    message: "unlimited minigames",
    canToggleSubcheats: true,
    subcheats: [
        { name: "mining", message: "mining minigame cheat", fn: minigameCheat },
        { name: "fishing", message: "fishing minigame cheat", fn: minigameCheat },
        { name: "catching", message: "catching minigame cheat", fn: minigameCheat },
        { name: "choppin", message: "choppin minigame cheat", fn: minigameCheat },
        { name: "poing", message: "poing minigame cheat", fn: minigameCheat },
        { name: "hoops", message: "hoops minigame cheat", fn: minigameCheat },
        { name: "darts", message: "darts minigame cheat", fn: minigameCheat },
        { name: "wisdom", message: "wisdom monument minigame cheat", fn: minigameCheat },
        { name: "scratch", message: "event scratch minigame cheat", fn: minigameCheat },
    ],
});
