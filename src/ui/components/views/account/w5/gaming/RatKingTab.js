import van from "../../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../../assets/icons.js";
import { gga } from "../../../../../services/api.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { joinClasses, toInt, useWriteStatus, writeVerified } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { ActionButton } from "../../components/ActionButton.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { SetAllNumberControl } from "../../BulkActionBar.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span, button } = van.tags;

const PLANT_COUNT = 10;
const MUTATION_CHARS = ["_", "a", "b", "c", "d", "e", "f", "g", "h", "i"];
const MUTATION_LABELS = ["Base", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9"];

// Precompute all 100 crown IDs in canonical game order: ["0_", "0a", ..., "9i"]
export const ALL_CROWNS = Array.from({ length: PLANT_COUNT }, (_, p) => MUTATION_CHARS.map((m) => `${p}${m}`)).flat();

/**
 * Calculate the RatBitMulti multiplier from game code (N.js:15849884):
 * Math.max(1, Math.pow(1.13, crowns) + (100 * Math.min(10, crowns) + 50 * Math.max(0, crowns - 10)) / 100)
 */
export const calculateRatBitMulti = (crownCount) => {
    const count = Math.max(0, Number(crownCount) || 0);
    return Math.max(1, 1.13 ** count + Math.min(10, count) + 0.5 * Math.max(0, count - 10));
};

const formatMultiplier = (val) => {
    if (!Number.isFinite(val)) return "x1.00";
    if (val >= 1e6) return `x${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `x${(val / 1e3).toFixed(2)}K`;
    return `x${val.toFixed(2)}`;
};

/**
 * Returns how many mutations are unlocked for plant p based on logbook string Gaming[11].
 * In game code, Gaming[11] uses characters from Number2Letter (where 'j' is 10 = all unlocked).
 */
export const getUnlockedMutationCount = (logbookStr, plantIndex) =>
    Math.max(0, "_abcdefghij".indexOf(String(logbookStr ?? "").charAt(plantIndex)));

const statCard = (title, value, subtext) =>
    div(
        { class: "rat-king-stat-card" },
        span({ class: "rat-king-stat-card__title" }, title),
        span({ class: "rat-king-stat-card__value" }, value),
        span({ class: "rat-king-stat-card__subtext" }, subtext)
    );

export const RatKingTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming Rat King" });

    const crownsSet = van.state(new Set());
    const logbookStr = van.state("__________");
    const targetCount = van.state("0");

    const maxStatus = useWriteStatus();
    const discoveredStatus = useWriteStatus();
    const clearStatus = useWriteStatus();
    const setCountStatus = useWriteStatus();
    const matrixStatus = useWriteStatus();
    const maxLogbookStatus = useWriteStatus();

    const sortAndSaveCrowns = async (nextSet) => {
        const sorted = ALL_CROWNS.filter((id) => nextSet.has(id));
        await writeVerified("Research[11]", sorted);
        crownsSet.val = nextSet;
        targetCount.val = String(nextSet.size);
    };

    const toggleCrown = (crownId) =>
        matrixStatus.run(async () => {
            const next = new Set(crownsSet.val);
            next.has(crownId) ? next.delete(crownId) : next.add(crownId);
            await sortAndSaveCrowns(next);
        });

    const handleReclaimAll = () => maxStatus.run(() => sortAndSaveCrowns(new Set(ALL_CROWNS)));

    const handleClearAll = () => clearStatus.run(() => sortAndSaveCrowns(new Set()));

    const handleReclaimDiscovered = () =>
        discoveredStatus.run(async () => {
            const next = new Set();
            for (let p = 0; p < PLANT_COUNT; p++) {
                const unlocked = getUnlockedMutationCount(logbookStr.val, p);
                for (let m = 0; m < unlocked; m++) next.add(`${p}${MUTATION_CHARS[m]}`);
            }
            await sortAndSaveCrowns(next);
        });

    const handleSetCount = () =>
        setCountStatus.run(async () => {
            const desired = Math.max(0, Math.min(ALL_CROWNS.length, toInt(targetCount.val, 0)));
            if (desired === crownsSet.val.size) return;

            const current = ALL_CROWNS.filter((id) => crownsSet.val.has(id));
            const missing = ALL_CROWNS.filter((id) => !crownsSet.val.has(id));
            const next =
                desired > current.length
                    ? [...current, ...missing.slice(0, desired - current.length)]
                    : current.slice(0, desired);

            await sortAndSaveCrowns(new Set(next));
        });

    const updatePlantCrowns = (plantIndex, shouldClaim) =>
        matrixStatus.run(async () => {
            const next = new Set(crownsSet.val);
            for (const m of MUTATION_CHARS) {
                const id = `${plantIndex}${m}`;
                if (shouldClaim) next.add(id);
                else next.delete(id);
            }
            await sortAndSaveCrowns(next);
        });

    const handleMaxLogbook = () =>
        maxLogbookStatus.run(async () => {
            const maxed = "jjjjjjjjjj";
            await writeVerified("Gaming[11]", maxed);
            logbookStr.val = maxed;
        });

    const load = async () =>
        run(async () => {
            const [rawCrowns, rawLogbook] = await Promise.all([gga("Research[11]"), gga("Gaming[11]")]);
            const loadedCrowns = Array.isArray(rawCrowns) ? rawCrowns.filter((id) => typeof id === "string") : [];
            const loadedSet = new Set(loadedCrowns);
            crownsSet.val = loadedSet;
            targetCount.val = String(loadedSet.size);
            logbookStr.val = typeof rawLogbook === "string" ? rawLogbook : "__________";
        });

    load();

    const overviewSection = () =>
        div(
            { class: "rat-king-overview-cards" },
            statCard(
                "Reclaimed Crowns",
                () => `${crownsSet.val.size} / ${ALL_CROWNS.length}`,
                () =>
                    crownsSet.val.size === ALL_CROWNS.length
                        ? "All 100 Rat Crowns reclaimed!"
                        : `${ALL_CROWNS.length - crownsSet.val.size} crowns remaining`
            ),
            statCard(
                "Rat Bit Multiplier",
                () => formatMultiplier(calculateRatBitMulti(crownsSet.val.size)),
                "RatBitMulti garden bit bonus"
            ),
            statCard("Rat Currency Boost", () => `+${crownsSet.val.size}%`, "+1% King Token rate per crown"),
            statCard("Tome & Equinox", () => `${crownsSet.val.size} pts`, "Tome #111 & Dream Clouds 43/65")
        );

    const progressBar = () =>
        div(
            { class: "rat-king-progress-wrapper" },
            div(
                { class: "rat-king-progress-header" },
                span("COLLECTION PROGRESS"),
                span(() => `${crownsSet.val.size}%`)
            ),
            div(
                { class: "rat-king-progress-bar" },
                div({
                    class: "rat-king-progress-fill",
                    style: () => `--progress: ${crownsSet.val.size}%;`,
                })
            )
        );

    const bulkActionsBar = () =>
        div(
            { class: "rat-king-bulk-bar" },
            ActionButton({
                label: "MAX ALL (100)",
                variant: "max-reset",
                status: maxStatus.status,
                tooltip: "Reclaim all 100 Rat King crowns",
                onClick: handleReclaimAll,
            }),
            ActionButton({
                label: "RECLAIM DISCOVERED",
                variant: "apply",
                status: discoveredStatus.status,
                tooltip: "Reclaim crowns for all plant mutations currently discovered in Log Book (Gaming[11])",
                onClick: handleReclaimDiscovered,
            }),
            ActionButton({
                label: "CLEAR ALL (0)",
                variant: "danger",
                status: clearStatus.status,
                tooltip: "Clear all reclaimed crowns",
                onClick: handleClearAll,
            }),
            SetAllNumberControl({
                label: "Set Count:",
                value: targetCount,
                status: setCountStatus.status,
                applyLabel: "APPLY",
                min: 0,
                max: ALL_CROWNS.length,
                onApply: handleSetCount,
            })
        );

    const renderPlantCard = (p) => {
        const sproutLetter = String.fromCharCode(65 + p);

        return div(
            { class: "rat-king-plant-card" },
            div(
                { class: "rat-king-plant-header" },
                span({ class: "rat-king-plant-title" }, `Plant ${p + 1} (Sprout ${sproutLetter})`),
                span(
                    { class: "account-row__badge rat-king-badge--logbook" },
                    () => `LOGBOOK: ${getUnlockedMutationCount(logbookStr.val, p)}/10 DISCOVERED`
                ),
                div(
                    { class: "rat-king-plant-meta" },
                    span({ class: "account-row__badge rat-king-badge--crowns" }, Icons.Crown(), () => {
                        const owned = MUTATION_CHARS.filter((m) => crownsSet.val.has(`${p}${m}`)).length;
                        return `${owned}/10 CROWNS`;
                    }),
                    button(
                        {
                            type: "button",
                            class: "account-btn account-btn--max-reset",
                            disabled: () => matrixStatus.status.val === "loading",
                            onclick: () => updatePlantCrowns(p, true),
                            title: `Reclaim all 10 crowns for Plant ${p + 1}`,
                        },
                        "ALL"
                    ),
                    button(
                        {
                            type: "button",
                            class: "account-btn account-btn--danger",
                            disabled: () => matrixStatus.status.val === "loading",
                            onclick: () => updatePlantCrowns(p, false),
                            title: `Clear crowns for Plant ${p + 1}`,
                        },
                        "CLEAR"
                    )
                )
            ),
            div(
                { class: "rat-king-crowns-row" },
                ...MUTATION_CHARS.map((char, m) => {
                    const crownId = `${p}${char}`;
                    const label = MUTATION_LABELS[m];

                    return button(
                        {
                            type: "button",
                            class: () =>
                                joinClasses(
                                    "rat-king-crown-chip",
                                    crownsSet.val.has(crownId) ? "rat-king-crown-chip--active" : "",
                                    m >= getUnlockedMutationCount(logbookStr.val, p)
                                        ? "rat-king-crown-chip--locked"
                                        : ""
                                ),
                            disabled: () => matrixStatus.status.val === "loading",
                            title: () =>
                                `Crown ${crownId} - Plant ${p + 1} ${label}\nStatus: ${
                                    crownsSet.val.has(crownId) ? "RECLAIMED" : "NOT RECLAIMED"
                                }\nLog Book: ${m < getUnlockedMutationCount(logbookStr.val, p) ? "Discovered" : "Locked"}\n(Click to toggle)`,
                            onclick: () => toggleCrown(crownId),
                        },
                        span({ class: "rat-king-crown-chip__icon" }, Icons.Crown()),
                        span({ class: "rat-king-crown-chip__label" }, label)
                    );
                })
            )
        );
    };

    const logbookSection = () =>
        AccountSection({
            title: "LOG BOOK DISCOVERY SYNC",
            note: "Gaming[11] plant mutation discoveries",
            body: div(
                { class: "account-item-stack" },
                AccountRow({
                    info: [
                        div(
                            { class: "account-row__name-group" },
                            span({ class: "account-row__name" }, "Discovered Plants"),
                            span({ class: "gaming-raw-value" }, () => `Current: "${logbookStr.val}"`)
                        ),
                    ],
                    badge: () =>
                        logbookStr.val === "jjjjjjjjjj" ? "ALL MAXED" : `${logbookStr.val.replace(/_/g, "").length}/10`,
                    status: maxLogbookStatus.status,
                    controls: [
                        ActionButton({
                            label: "MAX LOG BOOK",
                            variant: "max-reset",
                            status: maxLogbookStatus.status,
                            disabled: () => logbookStr.val === "jjjjjjjjjj",
                            tooltip: "Max all 10 plant log book discoveries to 'jjjjjjjjjj'",
                            onClick: handleMaxLogbook,
                        }),
                    ],
                })
            ),
        });

    return PersistentAccountListPage({
        title: "RAT KING",
        description: "Manage Reclaimed Rat King Crowns (Research[11]) and Garden Log Book discoveries.",
        actions: RefreshButton({ onRefresh: load }),
        state: { loading, error },
        loadingText: "READING GAMING RAT KING",
        errorTitle: "GAMING RAT KING READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack rat-king-dashboard" },
            overviewSection(),
            progressBar(),
            bulkActionsBar(),
            AccountSection({
                title: "RECLAIMED RAT CROWNS MATRIX",
                note: "Research[11] (10 plants x 10 mutations = 100 crowns)",
                body: div(
                    { class: "rat-king-plants-grid" },
                    ...Array.from({ length: PLANT_COUNT }, (_, p) => renderPlantCard(p))
                ),
            }),
            logbookSection()
        ),
    });
};
