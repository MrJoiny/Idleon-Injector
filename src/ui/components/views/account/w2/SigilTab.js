/**
 * W2 — Sigils Tab (Alchemy)
 *
 * Data paths (within CauldronP2W[4]):
 *   [4][2*i + 1]  → tier for sigil i   (−1=Locked … 4=Eclectic)
 *   [4][2*i]      → EXP  for sigil i   (not displayed; tier-only UI)
 *
 * Sigil names: CustomLists.h.SigilDesc[i][0]  e.g. "BIG_MUSCLE"
 *   → underscores replaced with spaces, displayed uppercased.
 *   Defaults to "#N" if data is unavailable.
 *
 * Re-render strategy:
 *   All states created once; load() updates them in-place.
 *   DOM built once, hidden via CSS until first load.
 *   Individual SET and SET ALL never trigger a re-render.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p, select, option } = van.tags;

// ── Sigil tier definitions ──────────────────────────────────────────────────

const SIGIL_TIERS = [
    { value: -1, label: "LOCKED", cls: "locked" },
    { value: 0, label: "UNLOCKED", cls: "unlocked" },
    { value: 1, label: "BOOSTED", cls: "boosted" },
    { value: 2, label: "IONIZED", cls: "ionized" },
    { value: 3, label: "ETHEREAL", cls: "ethereal" },
    { value: 4, label: "ECLECTIC", cls: "eclectic" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const getTierInfo = (v) => SIGIL_TIERS.find((t) => t.value === Number(v)) ?? SIGIL_TIERS[0];

// ── SigilCard ──────────────────────────────────────────────────────────────

const SigilCard = ({ index, tierState, nameState }) => {
    const tierInput = van.state(String(tierState.val));
    const { status, run } = useWriteStatus();

    // Keep tierInput in sync when parent refreshes the backing state.
    van.derive(() => {
        tierInput.val = String(tierState.val);
    });

    const doSet = async () => {
        const tier = Math.min(4, Math.max(-1, Math.round(Number(tierInput.val))));
        if (isNaN(tier)) return;
        await run(async () => {
            await writeGga(`CauldronP2W[4][${2 * index + 1}]`, tier);
            tierState.val = tier;
        });
    };

    return div(
        {
            class: () => {
                const t = getTierInfo(tierState.val);
                return [
                    "sigil-card",
                    `sigil-card--${t.cls}`,
                    status.val === "success" ? "sigil-card--flash-success" : "",
                    status.val === "error" ? "sigil-card--flash-error" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
            },
        },
        // Header: index + name | tier badge
        div(
            { class: "sigil-card__header" },
            div(
                { class: "sigil-card__identity" },
                span({ class: "sigil-card__index" }, `#${index}`),
                span({ class: "sigil-card__name" }, () => nameState.val)
            ),
            span(
                { class: () => `sigil-card__tier-badge sigil-tier-badge--${getTierInfo(tierState.val).cls}` },
                () => getTierInfo(tierState.val).label
            )
        ),
        // Tier select
        select(
            {
                class: "sigil-card__tier-select select-base",
                onchange: (e) => (tierInput.val = e.target.value),
            },
            ...SIGIL_TIERS.map((t) =>
                option({ value: t.value, selected: () => Number(tierInput.val) === t.value }, t.label)
            )
        ),
        // SET button
        button(
            {
                class: () =>
                    `feature-btn feature-btn--apply sigil-card__set-btn ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                disabled: () => status.val === "loading",
                onclick: doSet,
            },
            () => (status.val === "loading" ? "…" : "SET")
        )
    );
};

// ── SigilTab ───────────────────────────────────────────────────────────────

export const SigilTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    // Per-sigil states — created once, updated in-place on every load.
    const sigilTier = Array.from({ length: 24 }, () => van.state(-1));
    const sigilName = Array.from({ length: 24 }, (_, i) => van.state(`#${i}`));

    // SET ALL state
    const setAllTier = van.state("-1");
    const setAllStatus = van.state(null);
    let setAllClearTimer = null;

    // ── Load ───────────────────────────────────────────────────────────────

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const [rawP2W, rawSigilDesc] = await Promise.all([
                readGga("CauldronP2W"),
                readGga("CustomLists.h.SigilDesc"),
            ]);

            // Fill tier values from CauldronP2W[4][2*i + 1]
            const sig4 = toIndexedArray(toIndexedArray(rawP2W ?? [])[4] ?? []);
            for (let i = 0; i < 24; i++) {
                sigilTier[i].val = Number(sig4[2 * i + 1] ?? -1);
            }

            // Fill sigil names from SigilDesc[i][0]; e.g. "BIG_MUSCLE" → "BIG MUSCLE"
            const descArr = toIndexedArray(rawSigilDesc ?? []);
            for (let i = 0; i < 24; i++) {
                const entry = toIndexedArray(descArr[i] ?? []);
                const raw = String(entry[0] ?? "").trim();
                sigilName[i].val = raw ? raw.replace(/_/g, " ").toUpperCase() : `#${i}`;
            }

            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to load";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    load();

    // ── SET ALL ────────────────────────────────────────────────────────────

    const doSetAll = async () => {
        if (setAllClearTimer) {
            clearTimeout(setAllClearTimer);
            setAllClearTimer = null;
        }

        const tier = Math.min(4, Math.max(-1, Math.round(Number(setAllTier.val))));
        if (isNaN(tier)) return;
        setAllStatus.val = "loading";
        try {
            const results = await Promise.allSettled(
                sigilTier.map((state, i) =>
                    writeGga(`CauldronP2W[4][${2 * i + 1}]`, tier).then(() => {
                        state.val = tier;
                    })
                )
            );
            const failed = results.filter((r) => r.status === "rejected").length;
            setAllStatus.val = failed === 0 ? "success" : "error";
            setAllClearTimer = setTimeout(() => {
                if (setAllStatus.val !== "loading") setAllStatus.val = null;
                setAllClearTimer = null;
            }, 1500);
        } catch {
            setAllStatus.val = "error";
            setAllClearTimer = setTimeout(() => {
                if (setAllStatus.val !== "loading") setAllStatus.val = null;
                setAllClearTimer = null;
            }, 1500);
        }
    };

    // ── Build DOM (once) ───────────────────────────────────────────────────

    const setAllBar = div(
        {
            class: () =>
                [
                    "sigil-setall-bar",
                    setAllStatus.val === "success" ? "sigil-setall-bar--success" : "",
                    setAllStatus.val === "error" ? "sigil-setall-bar--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        span({ class: "sigil-setall-bar__label" }, "SET ALL TIERS TO"),
        select(
            {
                class: "sigil-setall-bar__select select-base",
                onchange: (e) => (setAllTier.val = e.target.value),
            },
            ...SIGIL_TIERS.map((t) =>
                option({ value: t.value, selected: () => Number(setAllTier.val) === t.value }, t.label)
            )
        ),
        button(
            {
                class: () =>
                    `feature-btn feature-btn--apply ${setAllStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                disabled: () => setAllStatus.val === "loading",
                onclick: doSetAll,
            },
            () => (setAllStatus.val === "loading" ? "…" : "SET ALL")
        )
    );

    const grid = div(
        { class: "sigil-grid" },
        ...Array.from({ length: 24 }, (_, i) =>
            SigilCard({ index: i, tierState: sigilTier[i], nameState: sigilName[i] })
        )
    );

    const scroll = div({ class: () => paneClass("sigil-scroll scrollable-panel") }, setAllBar, grid);
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    return div(
        { class: "tab-container" },

        // Header
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ALCHEMY — SIGILS"),
                p({ class: "feature-header__desc" }, "Manage tier and unlock status for all 24 alchemy sigils.")
            ),
            div({ class: "feature-header__actions" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"))
        ),

        renderRefreshErrorBanner,

        // Loader — only before first successful load
        () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),

        // Error — only on failed initial load
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                : null,

        // Content — always in DOM; hidden via CSS until initialized
        scroll
    );
};
