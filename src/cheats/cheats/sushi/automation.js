import { simulateSushiKnowledge } from "./knowledge.js";
import { configureSushiWind } from "../../proxies/sushiWind.js";
import { gga } from "../../core/globals.js";
import { sushiTools } from "./station.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let busy = false;
let running = false;
let stopping = false;
let message = "Ready. Keep Sushi Station open in the game.";
let merges = 0;
let cycles = 0;
let purchaseMode = "manual";
let purchaseTier = 1;
let session = null;
let options = { targetCount: 40, reserveSlots: 2 };

function call(action, expected) {
    if (
        busy &&
        (gga !== session.game ||
            gga.Sushi !== session.data ||
            gga.Sushi[0] !== session.board ||
            gga.Sushi[1] !== session.plates ||
            gga.PixelHelperActor[27] !== session.actor ||
            session.actor.behaviors.getBehavior("ActorEvents_741") !== session.ui)
    )
        throw new Error("Game session changed; stopped.");
    return sushiTools(action, expected, options);
}

async function settle(plan = null) {
    const deadline = Date.now() + 60000;
    let last = "";
    let quiet = 0;
    while (Date.now() < deadline) {
        const state = call("status");
        if (state.dragging >= 0) throw new Error("Dragging detected; stopped.");
        const snapshot = JSON.stringify([state.board, state.plates]);
        if (state.pending || snapshot !== last) quiet = 0;
        else if (!quiet) quiet = Date.now();
        last = snapshot;
        if (quiet && Date.now() - quiet >= 750) return state;
        if (stopping && !plan) return null;
        await sleep(100);
    }
    throw new Error("East Wind did not settle within 60 seconds.");
}

async function sort(state) {
    if (stopping) return null;
    return call("sort", state.board);
}

const refill = async (state) => {
    while (!stopping && state.capped < options.targetCount && state.working.some((index) => state.board[index] < 0)) {
        const tier = purchaseMode === "wind" ? state.suggestedTier : purchaseTier;
        message = `Buying tier ${tier} sushi. Capped: ${state.capped}/${options.targetCount}.`;
        const result = await call("buy", { board: state.board, plates: state.plates, purchaseTier: tier });
        if (!result.bought) break;
        // Native purchases are synchronous and verified by the helper. Yield
        // between them for Stop, then read fresh state instead of waiting for Wind.
        await sleep(50);
        if (stopping) return null;
        state = await call("status");
        if (state.dragging >= 0) throw new Error("A sushi is being dragged; purchasing stopped.");
        if (state.pending) state = await settle();
        if (!state) return null;
    }
    // Keep the full stability check once before returning to native merges.
    if (stopping) return null;
    state = await settle();
    if (!state || stopping) return null;
    message = "Refill complete. Sorting before merging…";
    if (!(await sort(state))) return null;
    cycles++;
    return await settle();
};

const playLoop = async () => {
    let state = await settle();
    if (!state || stopping) return;
    if (state.reserved.some((index) => state.board[index] >= 0)) {
        if (!(await sort(state))) return;
        state = await settle();
        if (!state || stopping) return;
    }
    let mode = "resume";
    let landing = null;
    while (!stopping) {
        if (state.capped >= options.targetCount) {
            if (!(await sort(state))) return;
            message = `Finished: ${state.capped}/${options.targetCount} tier ${state.targetTier + 1}+ sushi.`;
            return;
        }
        const plan = await call("plan", { mode, landing, board: state.board });
        if (!plan) {
            if (mode === "start") {
                if (!state.working.some((index) => state.board[index] < 0))
                    throw new Error("Working slots are full and no legal merge remains.");
                state = await refill(state);
                if (!state || stopping) return;
                mode = "resume";
                continue;
            }
            message = "Chain complete. Sorting before the next start…";
            if (stopping || !(await sort(state))) return;
            cycles++;
            state = await settle();
            if (!state || stopping) return;
            mode = "start";
            landing = null;
            continue;
        }
        if (plan.tier >= state.targetTier) throw new Error("Capped sushi cannot be merged.");
        if (stopping) return;
        message = `${plan.kind === "final" ? "Final pair" : plan.kind === "gap" ? "Across gap" : "Starting chain"}: tier ${plan.tier + 1}, slot ${plan.source + 1} → ${plan.target + 1}.`;
        call("merge", plan);
        message = `Waiting for East Wind after merge ${merges + 1}…`;
        state = await settle(plan);
        merges++;
        if (stopping) return;
        if (plan.kind === "final") {
            message = "Final pair complete. Sorting…";
            if (!(await sort(state))) return;
            cycles++;
            state = await settle();
            if (!state || stopping) return;
            mode = "start";
            landing = null;
        } else {
            mode = "continue";
            landing = plan.target;
        }
    }
};

export function sushiAutomation(params = []) {
    const action = params[0] || "status";
    if (action === "knowledge") {
        if (busy) throw new Error("Stop automation before adding Knowledge XP.");
        message = simulateSushiKnowledge(Number(params[1]), Number(params[2]));
        return { busy, message };
    }
    if (action === "stop") {
        if (busy) {
            stopping = true;
            message = "Stopping after current native effects finish…";
        }
        return { busy, running, stopping, message };
    }
    if (action === "status") {
        try {
            const state =
                !busy && params.length > 3
                    ? sushiTools("status", null, {
                          ...options,
                          targetCount: Number(params[3]),
                          targetTier: Number(params[4]),
                          reserveSlots: Number(params[5]),
                      })
                    : call("status");
            return { ...state, options, busy, running, stopping, message, merges, cycles };
        } catch (error) {
            return {
                ...sushiTools("settings"),
                options,
                busy,
                running,
                stopping,
                message,
                error: error.message,
                merges,
                cycles,
            };
        }
    }
    if (!["start", "sort", "configure"].includes(action))
        throw new Error("Use status, sort, stop, start manual <tier>, or start wind.");
    if (busy) throw new Error("Sushi automation is already running.");
    const requested = {
        targetCount: params[3] === undefined ? 40 : Number(params[3]),
        targetTier: params[4] === undefined ? undefined : Number(params[4]),
        reserveSlots: params[5] === undefined ? 2 : Number(params[5]),
        extendChain: params[6] === undefined ? Boolean(options.extendChain) : params[6] === "true",
        higherTier: params[7] === undefined ? Boolean(options.higherTier) : params[7] === "true",
    };
    const initial = sushiTools(action === "configure" ? "settings" : "status", null, requested);
    if (
        !Number.isInteger(requested.reserveSlots) ||
        requested.reserveSlots < 0 ||
        requested.reserveSlots >= 120 ||
        (requested.targetTier !== undefined &&
            (!Number.isInteger(requested.targetTier) ||
                requested.targetTier < 1 ||
                requested.targetTier > initial.maxTier + 1))
    )
        throw new Error("Choose a valid target tier and 0–119 reserved slots.");
    if (
        !Number.isInteger(requested.targetCount) ||
        requested.targetCount < 1 ||
        requested.targetCount > 120 ||
        (action === "start" && requested.targetCount > initial.working.length)
    )
        throw new Error("Target quantity must fit the usable board slots.");
    if (initial.dragging >= 0) throw new Error("Release the sushi before starting.");
    const mode = params[1] || "manual";
    const tier = params[2] === undefined ? 1 : Number(params[2]);
    if (
        action !== "sort" &&
        (!["manual", "wind"].includes(mode) ||
            !Number.isInteger(tier) ||
            tier < 1 ||
            (mode === "manual" && tier > initial.maxPurchaseTier))
    )
        throw new Error("Choose an unlocked whole-number tier.");
    configureSushiWind(requested.extendChain, requested.higherTier);
    options = requested;
    purchaseMode = mode;
    purchaseTier = tier;
    if (action === "configure") {
        message = "Settings applied.";
        return { busy, running, stopping, message };
    }
    const actor = gga.PixelHelperActor[27];
    session = {
        game: gga,
        data: gga.Sushi,
        board: gga.Sushi[0],
        plates: gga.Sushi[1],
        actor,
        ui: actor.behaviors.getBehavior("ActorEvents_741"),
    };
    busy = true;
    running = action === "start";
    stopping = false;
    merges = 0;
    cycles = 0;
    message = "Waiting for the board…";
    const task =
        action === "start"
            ? playLoop()
            : (async () => {
                  const state = await settle();
                  if (state && !stopping) message = (await sort(state)).message;
              })();
    void task
        .then(() => {
            if (stopping) message = `Stopped after ${merges} merges.`;
        })
        .catch((error) => {
            message = `Stopped: ${error.message}`;
        })
        .finally(() => {
            busy = false;
            running = false;
            stopping = false;
            session = null;
        });
    return { busy, running, stopping, message };
}
