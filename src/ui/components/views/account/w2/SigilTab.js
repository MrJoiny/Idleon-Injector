/**
 * W2 — Sigils Tab (Alchemy)
 *
 * Data paths (within CauldronP2W[4]):
 *   [4][2*i + 1]  → tier for sigil i   (−1=Locked … 4=Eclectic)
 *   [4][2*i]      → EXP  for sigil i   (not displayed; tier-only UI)
 *
 * Sigil names: cList.SigilDesc[i][0]  e.g. "BIG_MUSCLE"
 *   → underscores replaced with spaces, displayed uppercased.
 *   Defaults to "#N" if data is unavailable.
 *
 * Re-render strategy:
 *   All states created once; load() updates them in-place.
 *   DOM built once, hidden via CSS until first load.
 *   Individual SET and SET ALL never trigger a re-render.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, ggaMany, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoadState } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { useWriteStatus, writeVerified } from "../featureShared.js";

const { div, button, span, select, option } = van.tags;

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
            const path = `CauldronP2W[4][${2 * index + 1}]`;
            await writeVerified(path, tier, { message: `Write mismatch at ${path}: expected ${tier}` });
            tierState.val = tier;
        });
    };

    return div(
        {
            class: () => {
                const t = getTierInfo(tierState.val);
                return [
                    "tier-card",
                    `sigil-card--${t.cls}`,
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
            },
        },
        // Header: index + name | tier badge
        div(
            { class: "tier-card__header" },
            div(
                { class: "tier-card__identity" },
                span({ class: "tier-card__index" }, `#${index}`),
                span({ class: "tier-card__name" }, () => nameState.val)
            ),
            span(
                { class: () => `tier-card__badge sigil-tier-badge--${getTierInfo(tierState.val).cls}` },
                () => getTierInfo(tierState.val).label
            )
        ),
        // Tier select
        select(
            {
                class: "tier-card__select select-base",
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
                    `feature-btn feature-btn--apply tier-card__set-btn ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                disabled: () => status.val === "loading",
                onclick: doSet,
            },
            () => (status.val === "loading" ? "…" : "SET")
        )
    );
};

// ── SigilTab ───────────────────────────────────────────────────────────────

export const SigilTab = () => {
    const { loading, error, run } = useAccountLoadState({ label: "Sigils" });

    // Per-sigil states — created once, updated in-place on every load.
    const sigilTier = Array.from({ length: 24 }, () => van.state(-1));
    const sigilName = Array.from({ length: 24 }, (_, i) => van.state(`#${i}`));

    // SET ALL state
    const setAllTier = van.state("-1");
    const { status: setAllStatus, run: runSetAll } = useWriteStatus();

    // ── Load ───────────────────────────────────────────────────────────────

    const load = async () =>
        run(async () => {
            const [rawP2W, rawSigilDesc] = await Promise.all([gga("CauldronP2W"), readCList("SigilDesc")]);

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
        });

    load();

    // ── SET ALL ────────────────────────────────────────────────────────────

    const doSetAll = async () => {
        const tier = Math.min(4, Math.max(-1, Math.round(Number(setAllTier.val))));
        if (isNaN(tier)) return;
        await runSetAll(async () => {
            const writes = [];
            for (let i = 0; i < sigilTier.length; i++) {
                if (Number(sigilTier[i].val) === tier) continue;
                writes.push({ path: `CauldronP2W[4][${2 * i + 1}]`, value: tier });
            }
            if (writes.length > 0) {
                const result = await ggaMany(writes);
                const failed = result.results.filter((entry) => !entry.ok);
                if (failed.length > 0) {
                    throw new Error(`Write mismatch at ${failed[0].path}: expected ${tier}`);
                }
            }
            for (let i = 0; i < sigilTier.length; i++) {
                sigilTier[i].val = tier;
            }
        });
    };

    // ── Build DOM (once) ───────────────────────────────────────────────────

    const setAllBar = div(
        {
            class: () =>
                [
                    "tier-setall-bar",
                    setAllStatus.val === "success" ? "feature-row--success" : "",
                    setAllStatus.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        span({ class: "tier-setall-bar__label" }, "SET ALL TIERS TO"),
        select(
            {
                class: "tier-setall-bar__select select-base",
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
        { class: "tier-grid" },
        ...Array.from({ length: 24 }, (_, i) =>
            SigilCard({ index: i, tierState: sigilTier[i], nameState: sigilName[i] })
        )
    );

    const scroll = div({ class: "tier-scroll scrollable-panel" }, setAllBar, grid);
    return AccountPageShell({
        header: FeatureTabHeader({
            title: "ALCHEMY - SIGILS",
            description: "Manage tier and unlock status for all 24 alchemy sigils.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        persistentState: { loading, error },
        body: scroll,
    });
};
