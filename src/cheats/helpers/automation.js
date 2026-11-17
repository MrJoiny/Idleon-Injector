import { bEngine, cList, gga } from "../core/globals.js";
import { runClickers } from "./automation/clickers.js";
import { runShops } from "./automation/shops.js";

export { CLICKER_KEYS, getAutomationClicker } from "./automation/clickers.js";
export { getAutomationShops } from "./automation/shops.js";

/** One Automation tick for every group, only while a character is in its map (character select has no player). */
export function runAutomation() {
    if (bEngine.scene.name !== cList.MapName[gga.CurrentMap]) return;
    runShops();
    runClickers();
}
