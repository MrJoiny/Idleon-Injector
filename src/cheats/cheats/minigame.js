/**
 * Minigame Cheats
 *
 * Cheats for minigame manipulation:
 * - Mining, Fishing, Catching, Choppin, Poing
 * - Hoops, Darts, Wisdom Monument, Scratch
 *
 * Proxies are set up at startup via setupMinigameProxies() in setup.js.
 * These commands only toggle cheatState booleans.
 */

import { registerCheats } from "../core/registration.js";

// Register minigame cheats
registerCheats({
    name: "minigame",
    message: "unlimited minigames",
    subcheats: [
        { name: "mining", message: "mining minigame cheat" },
        { name: "fishing", message: "fishing minigame cheat" },
        { name: "catching", message: "catching minigame cheat" },
        { name: "choppin", message: "choppin minigame cheat" },
        { name: "poing", message: "poing minigame cheat" },
        { name: "hoops", message: "hoops minigame cheat" },
        { name: "darts", message: "darts minigame cheat" },
        { name: "wisdom", message: "wisdom monument minigame cheat" },
        { name: "scratch", message: "event scratch minigame cheat" },
    ],
});
