import { bEngine, behavior, events, gga } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";
import { busy, enabled, startSushi, stopSushi, sortSushi } from "../cheats/sushi/automation.js";
import { createMethodProxy } from "../utils/proxy.js";

const buttons = new WeakMap();
const x = 764;
const y = [332, 370];
const width = 174;
const height = 30;

function isSushiBoard(ui) {
    return (
        cheatConfig.w7.sushitools.ingameButtons === true &&
        ui.wrapper.enabled &&
        gga.MenuType2 === 102 &&
        ui._UIinventory17On[64] === 1 &&
        ui._GenINFO[142] === 0
    );
}

function hoveredButton() {
    return y.findIndex((top) => events(189)._customBlock_IsXYmouseWithinBounds(x, x + width, top, top + height) === 1);
}

function canClick(ui, index) {
    if (index === 0 && enabled) return true;
    return (
        !enabled &&
        !busy &&
        ui._GenINFO[150] === 0 &&
        ui._GenINFO[151] < 0 &&
        (index === 0 || ui._GenINFO[157].length === 0)
    );
}

function buttonImage(label) {
    const bitmap = behavior.newImage(width, height);
    const background = behavior.getExternalImage("UIboxbg.png");
    const scale = bitmap.width / width;
    // Stretch the fill and edges separately to keep the native 3px border crisp.
    for (const [sx, sw, dx, dw] of [
        [0, 3, 0, 3],
        [3, background.width - 6, 3, width - 6],
        [background.width - 3, 3, width - 3, 3],
    ]) {
        for (const [sy, sh, dy, dh] of [
            [0, 3, 0, 3],
            [3, background.height - 6, 3, height - 6],
            [background.height - 3, 3, height - 3, 3],
        ]) {
            // The native image API scales crop coordinates; the source bitmap uses raw pixels.
            const part = behavior.getSubImage(background, sx / scale, sy / scale, sw / scale, sh / scale);
            const resized = behavior.resizeImage(part, (dw * scale) / part.width, (dh * scale) / part.height, false);
            behavior.drawImageOnImage(resized, bitmap, dx, dy, 10);
            resized.dispose();
            part.dispose();
        }
    }
    const font = behavior.getFont(336);
    behavior.drawTextOnImage(
        bitmap,
        label,
        (width - font.getTextWidth(label) / scale) / 2,
        // This font's uppercase letters are 22px; its line height also includes larger icons.
        (height - 22) / 2,
        font
    );
    const image = events(124)._customBlock_imginstACTOR(bitmap);
    image.set_scaleX((image.get_scaleX() * width) / bitmap.width);
    image.set_scaleY((image.get_scaleY() * height) / bitmap.height);
    return image;
}

export function setupSushiButtonProxy() {
    const prototype = events(741).prototype;
    const originals = [prototype._event_Sushi, prototype._event_pressed, prototype._event_SushiandRG];

    createMethodProxy(prototype, "_event_Sushi", function (base) {
        let button = buttons.get(this);
        if (!isSushiBoard(this)) {
            if (button) {
                for (const image of Object.values(button.images)) behavior.removeImage(image);
                buttons.delete(this);
            }
            return base;
        }
        if (!button) {
            const images = {};
            for (const label of ["START", "STOP", "SORT", "ERROR"]) {
                images[label] = buttonImage(label);
                behavior.attachImageToActor(images[label], this.actor, x, y[label === "SORT" ? 1 : 0], 1);
            }
            button = { images, armed: -1, errorIndex: -1, errorUntil: 0 };
            buttons.set(this, button);
        }
        const hovered = hoveredButton();
        const errorIndex = Date.now() < button.errorUntil ? button.errorIndex : -1;
        button.images.START.set_visible(!enabled && errorIndex !== 0);
        button.images.STOP.set_visible(enabled && errorIndex !== 0);
        button.images.SORT.set_visible(errorIndex !== 1);
        button.images.ERROR.set_visible(errorIndex >= 0);
        if (errorIndex >= 0) button.images.ERROR.set_imgY(y[errorIndex]);
        for (const label of ["START", "STOP", "SORT"]) {
            const index = label === "SORT" ? 1 : 0;
            button.images[label].set_alpha(
                !canClick(this, index) ? 0.35 : hovered === index ? (button.armed === index ? 0.55 : 0.9) : 1
            );
        }
        return base;
    });

    createMethodProxy(prototype, "_event_pressed", function (base) {
        const button = buttons.get(this);
        if (button) {
            const index = hoveredButton();
            button.armed =
                isSushiBoard(this) && this._GenINFO[151] < 0 && index >= 0 && canClick(this, index) ? index : -1;
        }
        return base;
    });

    createMethodProxy(prototype, "_event_SushiandRG", function (base) {
        const button = buttons.get(this);
        if (!button) return base;
        const index = button.armed;
        button.armed = -1;
        if (index < 0 || !isSushiBoard(this) || hoveredButton() !== index || !canClick(this, index)) return base;
        button.errorUntil = 0;
        try {
            const result = index === 1 ? sortSushi() : enabled ? stopSushi() : startSushi();
            console.log(result.message);
        } catch (error) {
            button.errorIndex = index;
            button.errorUntil = Date.now() + 2000;
            console.error("Sushi tools:", error.message);
        }
        return base;
    });

    const actor = gga.PixelHelperActor[27];
    // The game leaves a zero sentinel here until the UI actor initializes.
    if (actor === 0) return;
    const ui = actor.behaviors.getBehavior("ActorEvents_741");
    const signals = [actor.whenUpdated, bEngine.whenMousePressed, bEngine.whenMouseReleased];
    const methods = [prototype._event_Sushi, prototype._event_pressed, prototype._event_SushiandRG];
    // Haxe already bound this actor's callbacks before injection. Preserve their order and recycling cleanup.
    originals.forEach((original, i) => {
        const previous = ui.hx__closures__[original.__id__];
        const replacement = methods[i].bind(ui);
        const signal = signals[i];
        const cleanup = actor.allListeners.h[actor.allEventReferences.indexOf(signal)];
        signal.listeners[signal.listeners.indexOf(previous)] = replacement;
        cleanup[cleanup.indexOf(previous)] = replacement;
        ui.hx__closures__[original.__id__] = replacement;
    });
}
