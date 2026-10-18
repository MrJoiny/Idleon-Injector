import { cheatConfig, webPort } from "../core/state.js";
import { sushiTools, sushiViewport } from "../helpers/sushiTools.js";

let frame = null;
let timer = null;

export function setupSushiOverlay() {
    if (timer) return;
    timer = setInterval(() => {
        try {
            if (!cheatConfig.sushiTools) throw new Error("Disabled");
            sushiTools("status");
            const view = sushiViewport();
            if (!frame) {
                frame = document.createElement("iframe");
                frame.id = "sushi-tools-overlay";
                frame.title = "Sushi tools";
                frame.src = `http://localhost:${webPort}/entry/sushi-tools.html`;
                document.body.appendChild(frame);
            }
            // The game uses a scaled canvas; anchor beneath the combo meter.
            frame.style.cssText = `position:fixed;border:0;z-index:999999;background:transparent;left:${view.left + 750 * view.sx}px;top:${view.top + 275 * view.sy}px;width:${202 * view.sx}px;height:${Math.max(310, 245 * view.sy)}px;`;
            frame.hidden = false;
        } catch {
            if (frame) frame.hidden = true;
        }
    }, 250);
}
