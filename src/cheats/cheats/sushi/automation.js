import { gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { configureSushiWind } from "../../proxies/sushiWind.js";
import { sushiTools } from "./station.js";
import { readSushiSettings } from "./settings.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export let busy = false;
export let enabled = false;
let message = "Ready. Keep Sushi Station open in the game.";
let merges = 0;
let cycles = 0;
let session = null;

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
    return sushiTools(action, expected, busy ? session.options : cheatConfig.w7.sushitools);
}

async function settle() {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        await sleep(50);
        if (!enabled) return null;
        const state = call("status");
        if (state.dragging >= 0) throw new Error("Dragging detected; stopped.");
        if (!state.pending) return state;
    }
    throw new Error("East Wind did not settle within 60 seconds.");
}

const refill = async (state) => {
    const options = session.options;
    while (enabled && state.capped < options.targetCount && state.working.some((index) => state.board[index] < 0)) {
        message = `Buying tier ${options.tier} sushi. Capped: ${state.capped}/${options.targetCount}.`;
        const result = call("buy", { board: state.board, plates: state.plates, purchaseTier: options.tier });
        if (!result.bought) break;
        // Yield for Disable, then read back the native purchase.
        await sleep(50);
        if (!enabled) return null;
        state = call("status");
        if (state.dragging >= 0) throw new Error("A sushi is being dragged; purchasing stopped.");
        if (state.pending) state = await settle();
        if (!state) return null;
    }
    if (!enabled) return null;
    cycles++;
    return state;
};

const playLoop = async () => {
    const options = session.options;
    let state = await settle();
    if (!state || !enabled) return;
    if (state.reserved.some((index) => state.board[index] >= 0)) {
        call("sort", state.board);
        state = await settle();
        if (!state || !enabled) return;
    }
    while (enabled) {
        if (state.capped >= options.targetCount) {
            call("sort", state.board);
            message = `Finished: ${state.capped}/${options.targetCount} tier ${state.targetTier + 1}+ sushi.`;
            return;
        }
        const plan = call("plan", { board: state.board });
        if (!plan) {
            if (!state.working.some((index) => state.board[index] < 0))
                throw new Error("Working slots are full and no legal merge remains.");
            state = await refill(state);
            if (!state || !enabled) return;
            continue;
        }
        if (plan.tier >= state.targetTier) throw new Error("Capped sushi cannot be merged.");
        if (!enabled) return;
        message = `Merging tier ${plan.tier + 1} with ${plan.tail.length} planned Wind upgrades.`;
        call("merge", plan);
        merges++;
        message = `Waiting for East Wind after merge ${merges}…`;
        state = await settle();
        if (!state || !enabled) return;
    }
};

export function getSushiStatus() {
    const state = { enabled, busy, message, merges, cycles };
    try {
        return { ...call("status"), ...state };
    } catch (error) {
        return { ...sushiTools("settings"), ...state, error: error.message };
    }
}

export function stopSushi() {
    enabled = false;
    configureSushiWind(false, false);
    message = "Auto Play disabled.";
    return { enabled, message };
}

export function startSushi() {
    if (busy) throw new Error("Previous automation is finishing. Try again.");
    const options = readSushiSettings();
    const initial = sushiTools("status", null, options);
    if (initial.dragging >= 0) throw new Error("Release the sushi before starting.");
    if (options.targetCount > initial.working.length)
        throw new Error("Target quantity must fit the usable board slots.");
    if (initial.board.filter((value) => value >= 0).length > initial.working.length)
        throw new Error("Clear " + options.reserveSlots + " slots before starting; no sushi will be deleted.");
    configureSushiWind(options.extendChain, options.higherTier);
    const actor = gga.PixelHelperActor[27];
    session = {
        options,
        game: gga,
        data: gga.Sushi,
        board: gga.Sushi[0],
        plates: gga.Sushi[1],
        actor,
        ui: actor.behaviors.getBehavior("ActorEvents_741"),
    };
    busy = true;
    enabled = true;
    merges = 0;
    cycles = 0;
    message = "Waiting for the board…";
    void playLoop()
        .catch((error) => {
            if (enabled) message = "Stopped: " + error.message;
        })
        .finally(() => {
            busy = false;
            session = null;
        });
    return { enabled, message: "Auto Play enabled. It will idle when the goal is reached." };
}

export function sortSushi() {
    if (enabled || busy) throw new Error("Disable Auto Play before sorting.");
    const options = { reserveSlots: 0 };
    const initial = sushiTools("status", null, options);
    const result = sushiTools("sort", initial.board, options);
    message = result.message;
    return { enabled, message };
}
