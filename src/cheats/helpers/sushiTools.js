import { gga, behavior, events } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";
import { isUIExpanded } from "../ui/overlay.js";
import {
    validateBoard,
    fuelTierSuggestions,
    boardLimits,
    findPairMove,
    sortBoard,
    findStartMove,
    findContinuationMove,
    findResumeMove,
} from "./sushiBoard.js";

function station() {
    if (!cheatConfig.sushiTools) throw new Error("Enable Sushi tools in Settings first.");
    if (Number(gga.MenuType2) !== 102 || isUIExpanded())
        throw new Error("Open the in-game Sushi board and close Cheats.");
    const actor = gga.PixelHelperActor[27].behaviors.getBehavior("ActorEvents_741");
    if (Number(actor._GenINFO[142]) !== 0) throw new Error("Select the Sushi board tab.");
    if (Number(actor._GenINFO[150]) !== 0) throw new Error("Switch from plate movement to sushi movement.");
    return actor;
}

export function sushiViewport() {
    const canvases = [];
    // Steam hosts the game in a same-origin iframe beneath its title bar.
    // Convert nested viewport coordinates into the top-level CDP viewport.
    const collect = (doc, left, top, sx, sy, depth) => {
        for (const canvas of doc.querySelectorAll("canvas")) {
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                canvases.push({
                    left: left + rect.left * sx,
                    top: top + rect.top * sy,
                    width: rect.width * sx,
                    height: rect.height * sy,
                });
            }
        }
        if (depth >= 4) return;
        for (const frame of doc.querySelectorAll("iframe")) {
            let child;
            try {
                child = frame.contentDocument;
            } catch {
                continue;
            }
            const rect = frame.getBoundingClientRect();
            if (!child || frame.hidden || !frame.offsetWidth || !frame.offsetHeight || !rect.width || !rect.height)
                continue;
            const scaleX = (sx * rect.width) / frame.offsetWidth;
            const scaleY = (sy * rect.height) / frame.offsetHeight;
            collect(
                child,
                left + rect.left * sx + frame.clientLeft * scaleX,
                top + rect.top * sy + frame.clientTop * scaleY,
                scaleX,
                scaleY,
                depth + 1
            );
        }
    };
    collect(document, 0, 0, 1, 1, 0);
    if (canvases.length !== 1) throw new Error("Cannot identify a unique game canvas.");
    const rect = canvases[0];
    const width = behavior.getScreenWidth();
    const height = behavior.getScreenHeight();
    if (!(width > 0 && height > 0)) throw new Error("Game dimensions unavailable.");
    return { left: rect.left, top: rect.top, sx: rect.width / width, sy: rect.height / height };
}

function point(index, viewport) {
    return {
        x: viewport.left + (49.5 + 47 * (index % 15)) * viewport.sx,
        y: viewport.top + (53.5 + 47 * Math.floor(index / 15)) * viewport.sy,
    };
}

export function sushiTools(action, expected = null) {
    const actor = station();
    const board = gga.Sushi[0];
    const plates = gga.Sushi[1];
    validateBoard(board, plates);
    const maxTier = Number(events(579)._customBlock_SushiStuff("MaxTier", 0, 0));
    const limits = boardLimits(board, plates, maxTier);
    const pending = actor._GenINFO[157].length;
    const dragging = Number(actor._GenINFO[151]);
    if (action === "status") {
        const rules = events(579);
        const maxPurchaseTier = Number(rules._customBlock_SushiStuff("MaxCookTier", 0, 0)) + 1;
        const eastWindTier =
            rules._customBlock_SushiStuff("UpgradeQTY", 29, 0) >= 1
                ? Math.max(0, Number(rules._customBlock_SushiStuff("UniqueSushi", 0, 0)) - 6)
                : 0;
        if (
            !Number.isInteger(maxPurchaseTier) ||
            maxPurchaseTier < 1 ||
            maxPurchaseTier > maxTier + 1 ||
            !Number.isInteger(eastWindTier)
        )
            throw new Error("Unexpected Sushi purchase limits.");
        const suggestedTier = Math.min(maxPurchaseTier, Math.max(1, eastWindTier - 26));
        const fuelPerSecond = Number(rules._customBlock_SushiStuff("FuelGen", 0, 0)) / 3600;
        const refillSlots = Math.max(0, limits.working.length - limits.capped);
        const fuelCosts = Array.from({ length: maxPurchaseTier }, (_, index) =>
            Number(rules._customBlock_SushiStuff("FuelCost", index, 0))
        );
        const fuelGuide = {
            perSecond: Number.isFinite(fuelPerSecond) ? fuelPerSecond : null,
            slots: refillSlots,
            suggestions: fuelTierSuggestions(fuelPerSecond, fuelCosts, refillSlots),
        };
        return {
            ...limits,
            fuelGuide,
            maxPurchaseTier,
            eastWindTier,
            suggestedTier,
            pending,
            dragging,
            board: board.slice(),
            plates: plates.slice(),
        };
    }
    if (action === "check") {
        const viewport = sushiViewport();
        return {
            pending,
            dragging,
            board: board.slice(),
            plates: plates.slice(),
            viewport,
            mouseX: behavior.getMouseX(),
            mouseY: behavior.getMouseY(),
        };
    }
    if (pending > 0) throw new Error("Wait for the current East Wind chain to finish.");
    if (dragging >= 0 || behavior.isMouseDown()) throw new Error("Release the mouse before using Sushi tools.");
    if (action === "buy") {
        if (!expected || JSON.stringify([board, plates]) !== JSON.stringify([expected.board, expected.plates]))
            throw new Error("Board changed before purchase; stopped.");
        if (limits.capped >= 40) return { bought: false };
        if (limits.reserved.some((index) => board[index] >= 0))
            throw new Error("Sort to clear the reserved slots first.");
        const destination = limits.working.find((index) => board[index] === -1);
        if (destination === undefined) return { bought: false };
        const rules = events(579);
        const purchaseTier = expected.purchaseTier;
        const maxCook = Number(rules._customBlock_SushiStuff("MaxCookTier", 0, 0));
        if (!Number.isInteger(purchaseTier) || purchaseTier < 1 || purchaseTier > maxCook + 1)
            throw new Error("Purchase tier is outside the unlocked range.");
        const storedTier = purchaseTier - 1;
        const cost = Number(rules._customBlock_SushiStuff("FuelCost", storedTier, 0));
        if (!(cost > 0) || !(Number(gga.Sushi[4][0]) >= cost))
            throw new Error(`Not enough fuel for tier ${purchaseTier} sushi.`);
        const trigger = actor._TRIGGEREDtext;
        const before = board.slice();
        try {
            // Use the game's tier selector so its purchase icon updates too.
            if (!Number.isInteger(maxCook) || maxCook < 0 || maxCook > maxTier)
                throw new Error("Unexpected cook tier limit.");
            for (let step = 0; Number(gga.Sushi[4][4]) !== storedTier && step <= maxCook; step++) {
                actor._TRIGGEREDtext = "B";
                actor._customEvent_sushistuff2();
            }
            if (Number(gga.Sushi[4][4]) !== storedTier) throw new Error(`Could not select tier ${purchaseTier}.`);
            actor._TRIGGEREDtext = "A";
            actor._customEvent_sushistuff2();
        } finally {
            actor._TRIGGEREDtext = trigger;
        }
        if (board[destination] < 0 || board.some((tier, index) => index !== destination && tier !== before[index]))
            throw new Error("Purchase read-back mismatch; no retry performed.");
        return { bought: true, tier: board[destination], destination };
    }
    if (action === "sort") {
        if (!expected || JSON.stringify(board) !== JSON.stringify(expected))
            throw new Error("Board changed; click Sort again.");
        const sorted = sortBoard(board, plates, maxTier);
        const changed = sorted.reduce((count, value, index) => count + Number(value !== board[index]), 0);
        // Keep the Haxe array identity and all plate/fireplace data intact.
        sorted.forEach((value, index) => {
            board[index] = value;
        });
        const trigger = actor._TRIGGEREDtext;
        try {
            for (let index = 0; index < board.length; index++) {
                actor._TRIGGEREDtext = `h${index}`;
                actor._customEvent_sushistuff();
            }
        } finally {
            actor._TRIGGEREDtext = trigger;
        }
        if (board.some((value, index) => value !== sorted[index])) throw new Error("Sort read-back mismatch.");
        return { message: changed ? `Sorted ${changed} slots.` : "Board already sorted.", board: board.slice() };
    }
    if (action === "plan") {
        if (!expected || JSON.stringify(board) !== JSON.stringify(expected.board))
            throw new Error("Board changed after settling; stopped.");
        const move =
            expected.mode === "continue"
                ? findContinuationMove(board, plates, expected.landing, maxTier)
                : expected.mode === "resume"
                  ? findResumeMove(board, plates, maxTier) || findStartMove(board, plates, maxTier)
                  : findStartMove(board, plates, maxTier) || findPairMove(board, plates, maxTier);
        if (!move) return null;
        const viewport = sushiViewport();
        return {
            ...move,
            from: point(move.source, viewport),
            to: point(move.target, viewport),
            viewport,
            board: board.slice(),
            plates: plates.slice(),
            tier: board[move.source],
        };
    }
    throw new Error("Unknown Sushi action.");
}
