import { bEngine, cList, gga } from "../core/globals.js";
import { runClickers } from "./autobuy/clickers.js";
import { runShops } from "./autobuy/shops.js";

export { CLICKER_KEYS, getAutobuyClicker } from "./autobuy/clickers.js";
export { getAutobuyShops } from "./autobuy/shops.js";

/** One Autobuy tick for every group, only while a character is in its map (character select has no player). */
export function runAutobuy() {
    if (bEngine.scene.name !== cList.MapName[gga.CurrentMap]) return;
    runShops();
    runClickers();
}
