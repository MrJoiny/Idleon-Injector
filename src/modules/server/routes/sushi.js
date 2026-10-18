const fs = require("fs/promises");
const path = require("path");
const { getRuntimePath } = require("../../utils/runtimePaths");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const occupied = (board) => board.reduce((count, tier) => count + Number(tier >= 0), 0);

function setupSushiRoutes(app, gameBridge, client) {
    let busy = false;
    let running = false;
    let stopping = false;
    let message = "Ready. Auto Play buys tier 1 and merges toward 40 capped sushi.";
    let merges = 0;
    let cycles = 0;
    let purchaseMode = "manual";
    let purchaseTier = 1;

    const call = async (action, expected) => {
        const result = await gameBridge.callHelper("sushiTools", [action, expected]);
        if (result.error) throw new Error(result.error.details || result.error.text);
        return result.value;
    };

    // Require both the game's queue and a quiet board, including between cycles.
    const settle = async (plan = null) => {
        const deadline = Date.now() + 60000;
        let quietSince = 0;
        let lastBoard = "";
        let merged = !plan;
        const mergeDeadline = Date.now() + 8000;
        while (Date.now() < deadline) {
            const state = await call("status");
            if (state.dragging >= 0) {
                // CDP acknowledging mouse-up does not mean the game has processed it.
                // Background frames may still report our own source as held.
                if (!plan || state.dragging !== plan.source)
                    throw new Error("An unexpected sushi is being dragged; automation stopped.");
                if (Date.now() > mergeDeadline)
                    throw new Error(
                        "Game did not finish releasing the sushi. Focus the game and check the board before restarting."
                    );
                quietSince = 0;
                await sleep(150);
                continue;
            }
            if (plan) {
                merged =
                    state.board[plan.source] === -1 &&
                    state.board[plan.target] > plan.tier &&
                    occupied(state.board) === occupied(plan.board) - 1;
                if (!merged && Date.now() > mergeDeadline) {
                    throw new Error("Merge was not verified. No retry performed.");
                }
            }
            const snapshot = JSON.stringify([state.board, state.plates]);
            if (state.pending || snapshot !== lastBoard || !merged) quietSince = 0;
            else if (!quietSince) quietSince = Date.now();
            lastBoard = snapshot;
            if (quietSince && Date.now() - quietSince >= 750) return state;
            if (stopping && !plan) return null;
            await sleep(150);
        }
        throw new Error("East Wind did not settle within 60 seconds. Stopped without another move.");
    };

    const sort = async (before) => {
        const backupDir = getRuntimePath("logs/sushi");
        await fs.mkdir(backupDir, { recursive: true });
        await fs.writeFile(path.join(backupDir, `before-sort-${Date.now()}.json`), JSON.stringify(before, null, 2));
        if (running && stopping) return null;
        const result = await call("sort", before.board);
        return result;
    };

    const drag = async (plan) => {
        let held = false;
        let releasePoint = null;
        try {
            releasePoint = plan.from;
            const mouse = (type, position, buttons) =>
                client.Input.dispatchMouseEvent({
                    type,
                    x: position.x,
                    y: position.y,
                    button: "left",
                    buttons,
                    clickCount: 1,
                });
            const check = async () => {
                const state = await call("check");
                if (JSON.stringify(state.viewport) !== JSON.stringify(plan.viewport))
                    throw new Error("Game resized; drag stopped.");
                if (JSON.stringify(state.board) !== JSON.stringify(plan.board))
                    throw new Error("Board changed during drag; stopped.");
                if (JSON.stringify(state.plates) !== JSON.stringify(plan.plates))
                    throw new Error("Plates changed during drag; stopped.");
                return state;
            };
            const checkPointer = (state, index) => {
                const column = Math.floor((state.mouseX - 26) / 47);
                const row = Math.floor((state.mouseY - 30) / 47);
                if (column !== index % 15 || row !== Math.floor(index / 15)) {
                    throw new Error("Mouse coordinate check failed; no merge attempted.");
                }
            };

            // Entering the game iframe can consume the first movement without updating
            // Stencyl's mouse position. Hover within the source cell until it catches up.
            let hovered = false;
            for (let attempt = 0; attempt < 6; attempt++) {
                await client.Input.dispatchMouseEvent({
                    type: "mouseMoved",
                    x: plan.from.x + (attempt % 2),
                    y: plan.from.y,
                    button: "none",
                    buttons: 0,
                });
                await sleep(120);
                const state = await check();
                if (state.dragging >= 0 || state.pending) throw new Error("Board is busy; drag cancelled.");
                if (
                    Math.floor((state.mouseX - 26) / 47) === plan.source % 15 &&
                    Math.floor((state.mouseY - 30) / 47) === Math.floor(plan.source / 15)
                ) {
                    hovered = true;
                    break;
                }
            }
            if (!hovered) throw new Error("Mouse coordinate check failed after hover; no merge attempted.");
            if (stopping) return false;
            held = true;
            await mouse("mousePressed", plan.from, 1);
            await sleep(160);
            if ((await check()).dragging !== plan.source) throw new Error("Game did not pick up the intended sushi.");
            for (let step = 1; step <= 6; step++) {
                await check();
                await mouse(
                    "mouseMoved",
                    {
                        x: plan.from.x + ((plan.to.x - plan.from.x) * step) / 6,
                        y: plan.from.y + ((plan.to.y - plan.from.y) * step) / 6,
                    },
                    1
                );
                await sleep(45);
            }
            checkPointer(await check(), plan.target);
            releasePoint = plan.to;
            await mouse("mouseReleased", plan.to, 0);
            held = false;
            return true;
        } finally {
            if (held && releasePoint) {
                // On failure before dropping, return to the picked-up cell and release.
                await client.Input.dispatchMouseEvent({
                    type: "mouseMoved",
                    ...releasePoint,
                    button: "left",
                    buttons: 1,
                });
                await client.Input.dispatchMouseEvent({
                    type: "mouseReleased",
                    ...releasePoint,
                    button: "left",
                    buttons: 0,
                    clickCount: 1,
                });
            }
        }
    };

    const refill = async (state) => {
        while (!stopping && state.capped < 40 && state.working.some((index) => state.board[index] < 0)) {
            const tier = purchaseMode === "wind" ? state.suggestedTier : purchaseTier;
            message = `Buying tier ${tier} sushi. Capped: ${state.capped}/40.`;
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
        // Keep the full stability check once before returning to mouse-driven merges.
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
        state = await refill(state);
        if (!state || stopping) return;
        let mode = "resume";
        let landing = null;
        while (!stopping) {
            if (state.capped >= 40) {
                if (!(await sort(state))) return;
                message = `Finished: ${state.capped}/40 tier ${state.maxTier + 1} sushi.`;
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
            if (plan.tier >= state.maxTier) throw new Error("Capped sushi cannot be merged.");
            if (stopping) return;
            message = `${plan.kind === "final" ? "Final pair" : plan.kind === "gap" ? "Across gap" : "Starting chain"}: tier ${plan.tier + 1}, slot ${plan.source + 1} → ${plan.target + 1}.`;
            if (!(await drag(plan))) return;
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

    app.get("/api/sushi/status", async (_req, res) => {
        const progress = () => ({ busy, running, stopping, message, merges, cycles });
        try {
            const state = await call("status");
            res.json({
                ...progress(),
                ready: !busy && state.pending === 0 && state.dragging < 0,
                pending: state.pending,
                capped: state.capped,
                target: 40,
                maxPurchaseTier: state.maxPurchaseTier,
                eastWindTier: state.eastWindTier,
                suggestedTier: state.suggestedTier,
                fuelGuide: state.fuelGuide,
                purchaseMode,
                purchaseTier,
            });
        } catch (error) {
            res.json({ ...progress(), ready: false, error: error.message });
        }
    });

    app.post("/api/sushi/action", async (req, res) => {
        const { action, settings } = await req.json();
        if (action === "stop") {
            if (running) {
                stopping = true;
                message = "Stopping after the current drag and East Wind chain…";
            }
            return res.json({ message, running, stopping });
        }
        if (!["sort", "play"].includes(action)) return res.status(400).json({ error: "Unknown Sushi action" });
        if (busy) return res.status(409).json({ error: "A Sushi action is already running." });
        busy = true;
        stopping = false;
        try {
            // Check menu/config before acknowledging a run. No live writes here.
            const initial = await call("status");
            if (initial.dragging >= 0) throw new Error("Release the mouse before starting.");
            if (action === "sort") {
                message = "Waiting for the board, then sorting…";
                const settled = await settle();
                const result = await sort(settled);
                message = result.message;
                busy = false;
                return res.json({ message });
            }
            const mode = settings?.mode ?? "manual";
            const tier = settings?.tier ?? 1;
            if (
                !["manual", "wind"].includes(mode) ||
                !Number.isInteger(tier) ||
                tier < 1 ||
                (mode === "manual" && tier > initial.maxPurchaseTier)
            )
                throw new Error("Choose an unlocked whole-number purchase tier.");
            purchaseMode = mode;
            purchaseTier = tier;
            merges = 0;
            cycles = 0;
            running = true;
            message = "Waiting for East Wind before choosing a move…";
            void playLoop()
                .then(() => {
                    if (stopping) message = `Stopped after ${merges} merges.`;
                })
                .catch((error) => {
                    message = `Stopped: ${error.message}`;
                })
                .finally(() => {
                    running = false;
                    busy = false;
                    stopping = false;
                });
            return res.json({ message, running: true });
        } catch (error) {
            message = error.message;
            busy = false;
            res.status(409).json({ error: error.message });
        }
    });
}

module.exports = { setupSushiRoutes };
