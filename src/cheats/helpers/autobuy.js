import { bEngine, cList, gga } from "../core/globals.js";
import { runOrion } from "./autobuy/orion.js";
import { runShops } from "./autobuy/shops.js";

export { getAutobuyOrion } from "./autobuy/orion.js";
export { getAutobuyShops } from "./autobuy/shops.js";

/** One Autobuy tick for every group, only while a character is in its map (character select has no player). */
export function runAutobuy() {
    if (bEngine.scene.name !== cList.MapName[gga.CurrentMap]) return;
    runShops();
    runOrion();
}
