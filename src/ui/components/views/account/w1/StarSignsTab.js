/**
 * W1 — Star Signs Tab
 *
 * Data sources:
 *   cList.StarQuests[i]     — [mapId, x, y, req1, req2, playersNeeded, starPoints, desc, type]
 *   gga.StarSignProg[i][0]  — string of player letters who completed (e.g. "_ab")
 *   gga.StarSignProg[i][1]  — 1 if unlocked, 0 if not
 *
 * Player → letter mapping (Number2Letter):
 *   Player 1 → "_", Player 2 → "a", Player 3 → "b", ... Player 10 → "i"
 *
 * Label groups by mapId:
 *   mapId <  50 → A-N
 *   mapId < 100 → B-N
 *   mapId < 150 → C-N
 *   mapId < 200 → D-N
 *   mapId < 250 → E-N
 *   mapId ≥ 250 → F-N
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readMany, writeAttr } from "../../../../helpers/gameHelper.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, h4, p, select, option } = van.tags;

// Player 1..10 → letter
const PLAYER_LETTERS = ["_", "a", "b", "c", "d", "e", "f", "g", "h", "i"];
const letterToPlayer = (l) => PLAYER_LETTERS.indexOf(l) + 1; // 0 if not found
const playerToLetter = (n) => PLAYER_LETTERS[n - 1] ?? null;

// Compute label (A-1, B-3, etc.) for each sign based on its mapId
function computeLabels(quests) {
    const counters = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    return quests.map((q) => {
        const mapId = parseInt(q[0]);
        const g = mapId < 50 ? "A" : mapId < 100 ? "B" : mapId < 150 ? "C"
                : mapId < 200 ? "D" : mapId < 250 ? "E" : "F";
        counters[g]++;
        return `${g}-${counters[g]}`;
    });
}

// Clean description: remove trailing AFK/progress text, replace underscores
const cleanDesc = (s) =>
    (s ?? "").replace(/_@_Progress.*$/, "").replace(/_/g, " ").trim();

// Parse progress string → ordered array of player numbers
const parseProgress = (str) =>
    (str ?? "").split("").map(letterToPlayer).filter((n) => n > 0);

// Encode player list back to string
const encodeProgress = (players) =>
    players.map(playerToLetter).filter(Boolean).join("");

// Get display name for a player slot (1-based)
const playerName = (num, usernames) =>
    usernames[num - 1] ?? `Player ${num}`;

// ── DragList: simple drag-reorder list ────────────────────────────────────
// Returns a DOM element with draggable items. onChange(newOrder) fires on drop.

const DragList = ({ items, renderItem, onChange }) => {
    let dragIdx = null;

    const container = div({ class: "starsign-drag-list" });

    const rebuild = (list) => {
        while (container.firstChild) container.removeChild(container.firstChild);
        list.forEach((item, i) => {
            const row = div({ class: "starsign-drag-row", draggable: true });
            row.appendChild(div({ class: "starsign-drag-handle" }, "⠿"));
            row.appendChild(renderItem(item, i));
            row.addEventListener("dragstart", () => { dragIdx = i; row.classList.add("dragging"); });
            row.addEventListener("dragend",   () => { dragIdx = null; row.classList.remove("dragging"); });
            row.addEventListener("dragover",  (e) => { e.preventDefault(); row.classList.add("drag-over"); });
            row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
            row.addEventListener("drop", (e) => {
                e.preventDefault();
                row.classList.remove("drag-over");
                if (dragIdx === null || dragIdx === i) return;
                const next = [...list];
                const [moved] = next.splice(dragIdx, 1);
                next.splice(i, 0, moved);
                onChange(next);
                rebuild(next);
            });
            container.appendChild(row);
        });
    };

    rebuild(items);
    return container;
};

// ── Detail panel ──────────────────────────────────────────────────────────

const StarSignDetail = ({ sign, usernames = [], onSave, onBack }) => {
    const players  = van.state([...sign.players]);
    const status   = van.state(null);

    const addPlayer = (num) => {
        if (players.val.includes(num)) return;
        players.val = [...players.val, num];
    };

    const removePlayer = (num) => {
        players.val = players.val.filter((p) => p !== num);
    };

    const doSave = async () => {
        status.val = "loading";
        try {
            const str = encodeProgress(players.val);
            const unlocked = players.val.length >= sign.playersNeeded ? 1 : 0;
            await writeAttr(`gga.StarSignProg[${sign.index}][0] = "${str}"`);
            await new Promise((r) => setTimeout(r, 150));
            await writeAttr(`gga.StarSignProg[${sign.index}][1] = ${unlocked}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1500);
            onSave?.({ index: sign.index, progress: str, unlocked });
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1500);
        }
    };

    const available = () =>
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((n) => !players.val.includes(n));

    return div({ class: "starsign-detail" },

        // Header
        div({ class: "starsign-detail-header" },
            button({ class: "starsign-back-btn", onclick: onBack }, "← Back"),
            div(null,
                h4({ class: "starsign-detail-label" }, sign.label),
                p({ class: "starsign-detail-desc" }, sign.desc)
            ),
            div({ class: "starsign-detail-meta" },
                span({ class: "starsign-needed-badge" },
                    `${sign.playersNeeded} player${sign.playersNeeded > 1 ? "s" : ""} needed`
                )
            )
        ),

        // Player order list (drag to reorder)
        div({ class: "starsign-section-label" }, "Players who completed this sign (drag to reorder)"),

        () => {
            const list = players.val;
            if (!list.length)
                return div({ class: "starsign-empty-players" }, "No players added yet");

            return DragList({
                items:      list,
                renderItem: (playerNum) => {
                    const row = div({ class: "starsign-player-chip" },
                        span({ class: "starsign-player-num" }, playerName(playerNum, usernames)),
                        span({ class: "starsign-player-letter" }, playerToLetter(playerNum) ?? "?"),
                        button({
                            class:   "starsign-remove-btn",
                            onclick: () => removePlayer(playerNum),
                        }, "✕")
                    );
                    return row;
                },
                onChange: (newOrder) => { players.val = newOrder; },
            });
        },

        // Add player row
        div({ class: "starsign-add-row" },
            select({
                id:    `add-player-select-${sign.index}`,
                class: "statue-tier-select",
            },
                option({ value: "", disabled: true, selected: true }, "Add player…"),
                ...[1,2,3,4,5,6,7,8,9,10].map((n) =>
                    option({ value: n }, playerName(n, usernames))
                )
            ),
            button({
                class:   "feature-btn feature-btn--apply",
                onclick: () => {
                    const sel = document.getElementById(`add-player-select-${sign.index}`);
                    const val = parseInt(sel?.value);
                    if (val && !players.val.includes(val)) {
                        addPlayer(val);
                        sel.value = "";
                    }
                },
            }, "ADD")
        ),

        // Progress indicator
        div({ class: "starsign-progress-bar-wrap" },
            () => {
                const cur  = players.val.length;
                const need = sign.playersNeeded;
                const pct  = Math.min(100, (cur / need) * 100);
                return div(null,
                    div({ class: "starsign-progress-label" },
                        `${cur} / ${need} players — `,
                        cur >= need
                            ? span({ class: "starsign-unlocked-text" }, "✓ UNLOCKED")
                            : span({ class: "starsign-locked-text"   }, "LOCKED")
                    ),
                    div({ class: "starsign-progress-bar" },
                        div({ class: "starsign-progress-fill", style: `width:${pct}%` })
                    )
                );
            }
        ),

        // Save button
        div({ class: "starsign-detail-actions" },
            button({
                class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                onclick:  doSave,
                disabled: () => status.val === "loading",
            }, () => status.val === "loading" ? "..." : status.val === "success" ? "✓ SAVED" : "SAVE"),
            status.val === "error"
                ? span({ class: "starsign-save-error" }, "Save failed — check game is running")
                : null
        )
    );
};

// ── Main list card ────────────────────────────────────────────────────────

const StarSignCard = ({ sign, onClick }) => {
    const isUnlocked  = sign.unlocked;
    const cur         = sign.players.length;
    const need        = sign.playersNeeded;
    const pct         = Math.min(100, (cur / need) * 100);
    const groupColors = { A: "sign-A", B: "sign-B", C: "sign-C", D: "sign-D", E: "sign-E", F: "sign-F" };
    const groupClass  = groupColors[sign.label[0]] ?? "";

    return div({
        class:   `starsign-card ${isUnlocked ? "starsign-card--unlocked" : ""} ${groupClass}`,
        onclick: () => onClick(sign),
    },
        div({ class: "starsign-card-header" },
            span({ class: `starsign-label-badge ${groupClass}` }, sign.label),
            isUnlocked
                ? span({ class: "starsign-status unlocked" }, "✓ UNLOCKED")
                : span({ class: "starsign-status locked"   }, `${cur}/${need}`)
        ),
        p({ class: "starsign-card-desc" }, sign.desc),
        div({ class: "starsign-card-bar" },
            div({ class: "starsign-card-fill", style: `width:${pct}%` })
        )
    );
};

// ── StarSignsTab ──────────────────────────────────────────────────────────

export const StarSignsTab = () => {
    const signs      = van.state(null); // array of sign objects
    const loading    = van.state(false);
    const error      = van.state(null);
    const activeSign = van.state(null); // sign object being edited

    const toArr = (raw) => Array.isArray(raw)
        ? raw
        : Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const result = await readMany({
                quests:    `cList.StarQuests`,
                prog:      `gga.StarSignProg`,
                usernames: `gga.GetPlayersUsernames`,
            });

            const quests = toArr(result.quests ?? []);
            const prog   = toArr(result.prog   ?? []);
            const labels    = computeLabels(quests);
            const usernames = toArr(result.usernames ?? []).filter(u => typeof u === "string" && !u.startsWith("__"));

            signs.val = quests
                .map((q, i) => ({
                    index:         i,
                    label:         labels[i],
                    desc:          cleanDesc(q[7]),
                    playersNeeded: parseInt(q[5]) || 1,
                    players:       parseProgress(prog[i]?.[0]),
                    unlocked:      prog[i]?.[1] === 1 || prog[i]?.[1] === "1",
                    usernames,
                }))
                .filter((s) => s.desc.length > 0);
        } catch (e) {
            error.val = e.message || "Failed to read star signs";
        } finally {
            loading.val = false;
        }
    };

    // After saving from detail, update local state without full reload
    const handleSave = ({ index, progress, unlocked }) => {
        if (!signs.val) return;
        signs.val = signs.val.map((s) =>
            s.index === index
                ? { ...s, players: parseProgress(progress), unlocked: unlocked === 1 }
                : s
        );
        // Also update detail sign
        if (activeSign.val?.index === index) {
            activeSign.val = { ...activeSign.val, players: parseProgress(progress), unlocked: unlocked === 1, usernames: activeSign.val?.usernames ?? [] };
        }
    };

    load();

    const resetAll = async () => {
        if (!signs.val) return;
        for (const sign of signs.val) {
            await writeAttr(`gga.StarSignProg[${sign.index}][0] = ""`);
            await new Promise((r) => setTimeout(r, 40));
            await writeAttr(`gga.StarSignProg[${sign.index}][1] = 0`);
            await new Promise((r) => setTimeout(r, 40));
        }
        await load();
    };

    const unlockAll = async (randomize) => {
        if (!signs.val) return;
        for (const sign of signs.val) {
            const needed = sign.playersNeeded;
            let pool = [...Array(10).keys()].map((n) => n + 1); // [1..10]
            if (randomize) {
                // Fisher-Yates shuffle
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
            }
            const players = pool.slice(0, needed);
            const str = encodeProgress(players);
            await writeAttr(`gga.StarSignProg[${sign.index}][0] = "${str}"`);
            await new Promise((r) => setTimeout(r, 40));
            await writeAttr(`gga.StarSignProg[${sign.index}][1] = 1`);
            await new Promise((r) => setTimeout(r, 40));
        }
        await load();
    };

    return div({ class: "world-feature scroll-container" },

        div({ class: "feature-header" },
            div(null,
                h3("STAR SIGNS"),
                p({ class: "feature-header__desc" },
                    "Assign players (1–10) and drag to reorder completion order"
                )
            ),
            div({ class: "feature-header__actions" },
                withTooltip(
                    button({
                        class:   "feature-btn feature-btn--apply",
                        onclick: () => unlockAll(false),
                    }, "UNLOCK ALL"),
                    "Unlock all signs using players in order: _abcdefghi"
                ),
                withTooltip(
                    button({
                        class:   "feature-btn feature-btn--apply",
                        onclick: () => unlockAll(true),
                    }, "RANDOMIZE ALL"),
                    "Unlock all signs with a random player order per sign"
                ),
                withTooltip(
                    button({
                        class:   "feature-btn feature-btn--danger",
                        onclick: resetAll,
                    }, "RESET ALL"),
                    "Clear all star sign progress and lock everything"
                ),
                withTooltip(
                    button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                    "Re-read star sign data from game"
                )
            )
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING STAR SIGNS" }))
                );

            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "READ FAILED", subtitle: error.val })
                );

            if (!signs.val) return div({ class: "feature-list" });

            // Detail view
            if (activeSign.val)
                return div({ class: "feature-list" },
                    StarSignDetail({
                        sign:      activeSign.val,
                        usernames: activeSign.val.usernames ?? [],
                        onSave:    handleSave,
                        onBack:    () => (activeSign.val = null),
                    })
                );

            // Card grid view
            return div({ class: "starsign-grid" },
                ...signs.val.map((sign) =>
                    StarSignCard({
                        sign,
                        onClick: (s) => { activeSign.val = { ...s }; },
                    })
                )
            );
        }
    );
};
