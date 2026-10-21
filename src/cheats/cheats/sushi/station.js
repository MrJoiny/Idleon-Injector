import { gga, events } from "../../core/globals.js";
import { validateBoard, boardLimits, sortBoard, findStartMove, findContinuationMove, findResumeMove } from "./board.js";

function station() {
    if (Number(gga.MenuType2) !== 102) throw new Error("Keep the in-game Sushi board open.");
    const actor = gga.PixelHelperActor[27].behaviors.getBehavior("ActorEvents_741");
    if (actor._UIinventory17On[64] !== 1) throw new Error("Sushi board is not ready.");
    if (Number(actor._GenINFO[142]) !== 0) throw new Error("Select the Sushi board tab.");
    if (Number(actor._GenINFO[150]) !== 0) throw new Error("Switch from plate movement to sushi movement.");
    return actor;
}

function refreshStation(actor) {
    actor._DN7 = events(579)._customBlock_SushiStuff("CurrencyperHR", -1, 0);
    actor._DN7 = events(579)._customBlock_SushiStuff("OrangeFireSum", -1, 0);
    actor._TRIGGEREDtext = "m";
    actor._customEvent_sushistuff();
}

export function sushiTools(action, expected = null, options = {}) {
    if (action === "settings")
        return {
            maxTier: Number(events(579)._customBlock_SushiStuff("MaxTier", 0, 0)),
            maxPurchaseTier: Number(events(579)._customBlock_SushiStuff("MaxCookTier", 0, 0)) + 1,
        };
    const actor = station();
    const board = gga.Sushi[0];
    const plates = gga.Sushi[1];
    validateBoard(board, plates);
    const maxTier = Number(events(579)._customBlock_SushiStuff("MaxTier", 0, 0));
    const limits = boardLimits(board, plates, maxTier, options);
    const pending = actor._GenINFO[157].length;
    const dragging = Number(actor._GenINFO[151]);
    if (action === "status") {
        const rules = events(579);
        const maxPurchaseTier = Number(rules._customBlock_SushiStuff("MaxCookTier", 0, 0)) + 1;
        const eastWindTier =
            rules._customBlock_SushiStuff("UpgradeQTY", 29, 0) >= 1
                ? options.higherTier
                    ? maxTier
                    : Math.max(0, Number(rules._customBlock_SushiStuff("UniqueSushi", 0, 0)) - 6)
                : 0;
        if (
            !Number.isInteger(maxPurchaseTier) ||
            maxPurchaseTier < 1 ||
            maxPurchaseTier > maxTier + 1 ||
            !Number.isInteger(eastWindTier)
        )
            throw new Error("Unexpected Sushi purchase limits.");
        const suggestedTier = Math.min(maxPurchaseTier, Math.max(1, eastWindTier - 26));
        return {
            ...limits,
            maxPurchaseTier,
            eastWindTier,
            suggestedTier,
            pending,
            dragging,
            board: board.slice(),
            plates: plates.slice(),
        };
    }
    if (pending > 0) throw new Error("Wait for the current East Wind chain to finish.");
    if (dragging >= 0) throw new Error("Release the mouse before using Sushi tools.");
    if (action === "merge") {
        if (!expected || JSON.stringify([board, plates]) !== JSON.stringify([expected.board, expected.plates]))
            throw new Error("Board changed before merge; stopped.");
        const { source, target, tier } = expected;
        if (
            source === target ||
            !limits.working.includes(source) ||
            !limits.working.includes(target) ||
            tier < 0 ||
            tier >= maxTier ||
            tier >= limits.targetTier ||
            board[source] !== tier ||
            board[target] !== tier
        )
            throw new Error("Invalid native merge plan.");
        if (actor._GenINFO[158] !== 0) throw new Error("Native upgrade is still busy.");
        const count = board.filter((value) => value >= 0).length;
        const trigger = actor._TRIGGEREDtext;
        try {
            // The game's normal upgrade handler applies XP, bonuses and East Wind.
            // Consume exactly one matching source; never retry a partially completed merge.
            board[source] = -1;
            actor._TRIGGEREDtext = "i" + target;
            actor._customEvent_sushistuff();
            actor._TRIGGEREDtext = "h" + source;
            actor._customEvent_sushistuff();
            refreshStation(actor);
        } finally {
            actor._TRIGGEREDtext = trigger;
        }
        if (board[source] !== -1 || board[target] <= tier || board.filter((value) => value >= 0).length !== count - 1)
            throw new Error("Native merge read-back mismatch; stopped without retry.");
        return true;
    }
    if (action === "buy") {
        if (!expected || JSON.stringify([board, plates]) !== JSON.stringify([expected.board, expected.plates]))
            throw new Error("Board changed before purchase; stopped.");
        if (limits.capped >= (options.targetCount ?? 40)) return { bought: false };
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
            refreshStation(actor);
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
            refreshStation(actor);
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
                ? findContinuationMove(board, plates, expected.landing, maxTier, options)
                : expected.mode === "resume"
                  ? findResumeMove(board, plates, maxTier, options)
                  : findStartMove(board, plates, maxTier, options);
        if (!move) return null;
        return {
            ...move,
            board: board.slice(),
            plates: plates.slice(),
            tier: board[move.source],
        };
    }
    throw new Error("Unknown Sushi action.");
}
