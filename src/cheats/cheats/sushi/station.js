import { gga, events } from "../../core/globals.js";
import { validateBoard, boardLimits, sortBoard, findMergeMove } from "./board.js";

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
        if (!Number.isInteger(maxPurchaseTier) || maxPurchaseTier < 1 || maxPurchaseTier > maxTier + 1)
            throw new Error("Unexpected Sushi purchase limit.");
        return {
            ...limits,
            maxPurchaseTier,
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
        const { source, target, tier, layout } = expected;
        validateBoard(layout, plates);
        if (
            source === target ||
            !limits.working.includes(source) ||
            !limits.working.includes(target) ||
            tier < 0 ||
            tier >= maxTier ||
            tier >= limits.targetTier ||
            layout[source] !== tier ||
            layout[target] !== tier ||
            layout.some((value, index) => !limits.working.includes(index) && value !== board[index]) ||
            JSON.stringify(layout.slice().sort((a, b) => a - b)) !== JSON.stringify(board.slice().sort((a, b) => a - b))
        )
            throw new Error("Invalid native merge plan.");
        if (actor._GenINFO[158] !== 0) throw new Error("Native upgrade is still busy.");
        const count = board.filter((value) => value >= 0).length;
        const changed = layout.flatMap((value, index) => (value !== board[index] ? [index] : []));
        const trigger = actor._TRIGGEREDtext;
        try {
            layout.forEach((value, index) => {
                board[index] = value;
            });
            for (const index of changed) {
                if (index !== source && index !== target) {
                    actor._TRIGGEREDtext = "h" + index;
                    actor._customEvent_sushistuff();
                }
            }
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
        const changed = sorted.flatMap((value, index) => (value !== board[index] ? [index] : []));
        // Keep the Haxe array identity and all plate/fireplace data intact.
        sorted.forEach((value, index) => {
            board[index] = value;
        });
        const trigger = actor._TRIGGEREDtext;
        try {
            for (const index of changed) {
                actor._TRIGGEREDtext = `h${index}`;
                actor._customEvent_sushistuff();
            }
            if (changed.length) refreshStation(actor);
        } finally {
            actor._TRIGGEREDtext = trigger;
        }
        if (board.some((value, index) => value !== sorted[index])) throw new Error("Sort read-back mismatch.");
        return {
            message: changed.length ? `Sorted ${changed.length} slots.` : "Board already sorted.",
            board: board.slice(),
        };
    }
    if (action === "plan") {
        if (!expected || JSON.stringify(board) !== JSON.stringify(expected.board))
            throw new Error("Board changed after settling; stopped.");
        const rules = events(579);
        const move = findMergeMove(board, plates, maxTier, options, {
            wind: rules._customBlock_SushiStuff("UpgradeQTY", 29, 0) >= 1,
            limit: options.higherTier ? maxTier + 1 : Number(rules._customBlock_SushiStuff("UniqueSushi", 0, 0)) - 5,
            chainLimit: options.extendChain ? limits.working.length - 1 : 25,
            blueChance: Math.max(0, Math.min(1, Number(rules._customBlock_SushiStuff("FireplaceEffect", 2, 0)) / 100)),
            fireplaces: gga.Sushi[3],
            discovered: gga.Sushi[5],
        });
        if (!move) return null;
        return {
            ...move,
            board: board.slice(),
            plates: plates.slice(),
        };
    }
    throw new Error("Unknown Sushi action.");
}
