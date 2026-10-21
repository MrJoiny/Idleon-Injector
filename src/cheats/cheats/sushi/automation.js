import { gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { configureSushiWind } from "../../proxies/sushiWind.js";
import { sushiTools } from "./station.js";
import { readSushiSettings } from "./settings.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export let busy = false;
let running = false;
let stopping = false;
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
    const options = session.options;
    while (!stopping && state.capped < options.targetCount && state.working.some((index) => state.board[index] < 0)) {
        const tier = options.mode === "wind" ? state.suggestedTier : options.tier;
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
    const options = session.options;
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

export function getSushiStatus() {
    const state = { busy, running, stopping, message, merges, cycles };
    try {
        return { ...call("status"), ...state };
    } catch (error) {
        return { ...sushiTools("settings"), ...state, error: error.message };
    }
}

export function stopSushi() {
    if (busy) {
        stopping = true;
        message = "Stopping after current native effects finish…";
    }
    return { busy, running, stopping, message };
}

export function startSushi() {
    if (busy) throw new Error("Sushi automation is already running.");
    const options = readSushiSettings();
    const initial = sushiTools("status", null, options);
    if (initial.dragging >= 0) throw new Error("Release the sushi before starting.");
    if (options.targetCount > initial.working.length)
        throw new Error("Target quantity must fit the usable board slots.");
    if (initial.board.filter((value) => value >= 0).length > initial.working.length)
        throw new Error("Clear " + options.reserveSlots + " slots before starting; no sushi will be deleted.");
    configureSushiWind(options.extendChain, options.higherTier);
    return beginRun(playLoop, options, true);
}

export function sortSushi() {
    if (busy) throw new Error("Sushi automation is already running.");
    const options = { reserveSlots: 0 };
    const initial = sushiTools("status", null, options);
    if (initial.dragging >= 0) throw new Error("Release the sushi before sorting.");
    return beginRun(
        async () => {
            const state = await settle();
            if (state && !stopping) message = (await sort(state)).message;
        },
        options,
        false
    );
}

function beginRun(task, options, autoPlay) {
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
    running = autoPlay;
    stopping = false;
    merges = 0;
    cycles = 0;
    message = "Waiting for the board…";
    void task()
        .then(() => {
            if (stopping) message = "Stopped after " + merges + " merges.";
        })
        .catch((error) => {
            message = "Stopped: " + error.message;
        })
        .finally(() => {
            busy = false;
            running = false;
            stopping = false;
            session = null;
        });
    return { busy, running, stopping, message };
}
