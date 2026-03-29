/**
 * W3 — Refinery Tab
 *
 * Data sources:
 *   gga.Refinery[3..11][0]  — current charge (salt stored)
 *   gga.Refinery[3..11][1]  — level
 *   gga.ItemDefinitionsGET.h.Refinery1..9.h.displayName — refinery names
 *
 * Notes:
 *   - Refineries 7–9 require the "Polymer Refinery" research to be unlocked in-game.
 *   - Refinery 9 (gga.Refinery[11]) is a placeholder — not yet implemented in the game.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, readGgaEntries, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const REFINERY_COUNT = 9;
const REFINERY_OFFSET = 3; // gga.Refinery[3] = first refinery

// Indices 6–8 (game indices 9–11) require Polymer Refinery research
const POLYMER_LOCK_FROM = 6;
// Index 8 is a placeholder not yet in-game
const PLACEHOLDER_INDEX = 8;

// ── RefineryRow ────────────────────────────────────────────────────────────

const RefineryRow = ({ refIndex, name, levelState, chargeState }) => {
    const gameIndex = refIndex + REFINERY_OFFSET;
    const isPolymer = refIndex >= POLYMER_LOCK_FROM;
    const isPlaceholder = refIndex === PLACEHOLDER_INDEX;

    const levelInput = van.state("0");
    const chargeInput = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        levelInput.val = String(levelState.val ?? 0);
        chargeInput.val = String(chargeState.val ?? 0);
    });

    const doSet = async (field, val) => {
        const n = Math.max(0, Math.round(Number(val)));
        if (isNaN(n)) return;
        await run(async () => {
            const path = `Refinery[${gameIndex}][${field}]`;
            await writeGga(path, n);
            const verified = Math.max(0, Math.round(Number(await readGga(path))));
            if (verified !== n) throw new Error(`Write mismatch at ${path}: expected ${n}, got ${verified}`);
            if (field === 1) {
                levelState.val = verified;
            } else {
                chargeState.val = verified;
            }
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row refinery-row",
                    isPolymer ? "refinery-row--polymer" : "",
                    isPlaceholder ? "refinery-row--placeholder" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },

        // Left: index + name + badges
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, refIndex + 1),
            div(
                { class: "refinery-row__name-group" },
                span({ class: "feature-row__name" }, name),
                div(
                    { class: "refinery-row__badges" },
                    isPolymer
                        ? span({ class: "refinery-badge refinery-badge--polymer" }, Icons.Wrench(), " POLYMER")
                        : null,
                    isPlaceholder
                        ? span({ class: "refinery-badge refinery-badge--placeholder" }, Icons.Warning(), " NOT IN GAME")
                        : null
                )
            )
        ),

        // Centre: current level
        span({ class: "feature-row__badge" }, () => `LV ${levelState.val ?? 0}`),

        // Right: level + charge controls
        div(
            { class: "feature-row__controls feature-row__controls--stack" },

            div(
                { class: "refinery-control-row" },
                span({ class: "refinery-control-label" }, "Level"),
                NumberInput({
                    mode: "int",
                    value: levelInput,
                    oninput: (e) => (levelInput.val = e.target.value),
                    onDecrement: () => (levelInput.val = String(Math.max(0, Number(levelInput.val) - 1))),
                    onIncrement: () => (levelInput.val = String(Number(levelInput.val) + 1)),
                }),
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doSet(1, levelInput.val);
                        },
                    },
                    () => (status.val === "loading" ? "…" : "SET")
                )
            ),

            div(
                { class: "refinery-control-row" },
                span({ class: "refinery-control-label" }, "Charge"),
                NumberInput({
                    mode: "int",
                    value: chargeInput,
                    oninput: (e) => (chargeInput.val = e.target.value),
                    onDecrement: () => (chargeInput.val = String(Math.max(0, Number(chargeInput.val) - 1))),
                    onIncrement: () => (chargeInput.val = String(Number(chargeInput.val) + 1)),
                }),
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doSet(0, chargeInput.val);
                        },
                    },
                    () => (status.val === "loading" ? "…" : "SET")
                )
            )
        )
    );
};

// ── RefineryTab ────────────────────────────────────────────────────────────

export const RefineryTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const levelStates = Array.from({ length: REFINERY_COUNT }, () => van.state(0));
    const chargeStates = Array.from({ length: REFINERY_COUNT }, () => van.state(0));

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const refineryKeys = Array.from({ length: REFINERY_COUNT }, (_, i) => `Refinery${i + 1}`);
            const [raw, nameEntries] = await Promise.all([
                readGga("Refinery"),
                readGgaEntries("ItemDefinitionsGET.h", refineryKeys, ["displayName"]),
            ]);

            const names = refineryKeys.map((k, i) => {
                const entry = nameEntries[k];
                return entry?.displayName ?? `Refinery ${i + 1}`;
            });

            const levels = [];
            const charges = [];
            for (let i = 0; i < REFINERY_COUNT; i++) {
                const entry = (raw ?? [])[i + REFINERY_OFFSET] ?? [];
                charges.push(entry[0] ?? 0);
                levels.push(entry[1] ?? 0);
            }

            for (let i = 0; i < REFINERY_COUNT; i++) {
                chargeStates[i].val = Number(charges[i] ?? 0);
                levelStates[i].val = Number(levels[i] ?? 0);
            }

            data.val = { names };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "W3 — REFINERY"),
                p({ class: "feature-header__desc" }, "Set refinery levels and salt charges.")
            ),
            div({ class: "feature-header__actions" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"))
        ),

        // Notices
        div(
            { class: "refinery-notice refinery-notice--polymer" },
            span({ class: "refinery-notice__icon" }, Icons.Wrench()),
            span(
                {},
                "Refineries 7–9 require the ",
                span({ class: "refinery-notice__highlight" }, "Polymer Refinery"),
                " research to be unlocked in-game before they are available."
            )
        ),
        div(
            { class: "refinery-notice refinery-notice--placeholder" },
            span({ class: "refinery-notice__icon" }, Icons.Warning()),
            span(
                {},
                "Refinery 9 is a ",
                span({ class: "refinery-notice__highlight" }, "placeholder"),
                " — it does not exist in the game yet and setting it has no effect."
            )
        ),

        // List
        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val });
            if (!data.val) return null;

            return div(
                { class: "feature-list" },
                ...Array.from({ length: REFINERY_COUNT }, (_, i) =>
                    RefineryRow({
                        refIndex: i,
                        name: data.val.names[i] ?? `Refinery ${i + 1}`,
                        levelState: levelStates[i],
                        chargeState: chargeStates[i],
                    })
                )
            );
        }
    );
};
