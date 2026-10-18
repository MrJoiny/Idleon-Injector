const sort = document.getElementById("sort");
const play = document.getElementById("play");
const status = document.getElementById("status");
const mode = document.getElementById("purchase-mode");
const tier = document.getElementById("purchase-tier");
const fuelGuide = document.getElementById("fuel-guide");
const hint = document.getElementById("purchase-hint");
let limits = null;
try {
    const saved = JSON.parse(localStorage.getItem("sushi-purchase-settings"));
    if (saved && ["manual", "wind"].includes(saved.mode) && Number.isInteger(saved.tier) && saved.tier >= 1) {
        mode.value = saved.mode;
        tier.value = saved.tier;
    }
} catch {
    /* Storage is optional; defaults still work. */
}
function updatePurchaseControls() {
    mode.disabled = requesting || running;
    tier.disabled = requesting || running || mode.value === "wind";
    if (!limits) return;
    tier.max = limits.maxPurchaseTier;
    hint.textContent =
        mode.value === "wind"
            ? `Buys tier ${limits.suggestedTier}. Wind limit ${limits.eastWindTier} − 26, within unlocked tiers.`
            : `Unlocked: 1–${limits.maxPurchaseTier}. Sorts after every refill.`;
    fuelGuide.hidden = mode.value !== "manual";
    const guide = limits.fuelGuide;
    if (!guide || guide.perSecond === null || !guide.suggestions.length) {
        fuelGuide.textContent = "Fuel suggestions unavailable.";
    } else {
        const rate = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(
            guide.perSecond
        );
        const ranges = guide.suggestions
            .map(
                (item) =>
                    `${item.seconds / 60} min: ${item.tier === null ? "below tier 1 budget" : "up to tier " + item.tier}`
            )
            .join(" · ");
        fuelGuide.textContent = `Fuel: ${rate}/s\n${ranges}\nAssumes ${guide.slots} buys/cycle; 15% margin. Guide only; refill needs fuel in reserve.`;
    }
}
for (const control of [mode, tier])
    control.addEventListener("change", () => {
        try {
            localStorage.setItem(
                "sushi-purchase-settings",
                JSON.stringify({ mode: mode.value, tier: Number(tier.value) })
            );
        } catch {
            /* Optional persistence. */
        }
        updatePurchaseControls();
    });
let requesting = false;
let running = false;
let refreshing = false;

async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
        const response = await fetch("/api/sushi/status");
        const state = await response.json();
        running = state.running;
        if (state.maxPurchaseTier) limits = state;
        updatePurchaseControls();
        sort.disabled = requesting || !state.ready;
        play.textContent = running ? (state.stopping ? "Stopping…" : "Stop") : "Auto Play";
        play.disabled = requesting || state.stopping || (!running && (state.busy || (!state.ready && !state.pending)));
        play.title = running
            ? "Stop after the current drag and chain"
            : "Buy the selected tier, sort and merge until 40 capped sushi; keep two slots empty";
        status.textContent = state.error || state.message;
    } catch {
        sort.disabled = true;
        play.disabled = requesting || !running;
        status.textContent = "Connection lost. Auto Play may still be running; use Stop when reconnected.";
    } finally {
        refreshing = false;
    }
}

async function run(action) {
    if (requesting) return;
    if (action === "play" && mode.value === "manual" && !tier.reportValidity()) return;
    requesting = true;
    updatePurchaseControls();
    sort.disabled = play.disabled = true;
    try {
        const response = await fetch("/api/sushi/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action,
                settings: { mode: mode.value, tier: mode.value === "manual" ? Number(tier.value) : 1 },
            }),
        });
        const result = await response.json();
        status.textContent = result.error || result.message;
        if (result.running !== undefined) running = result.running;
    } catch {
        status.textContent = "Connection lost. Check the board before trying again.";
    } finally {
        requesting = false;
        await refresh();
    }
}

sort.addEventListener("click", () => run("sort"));
play.addEventListener("click", () => run(running ? "stop" : "play"));
setInterval(refresh, 400);
void refresh();
