/**
 * W1 — Star Signs Tab
 *
 * Data sources:
 *   cList.StarQuests[i]     — [mapId, x, y, req1, req2, playersNeeded, starPoints, desc, type]
 *   gga.StarSignProg[i][0]  — string of player letters who completed (e.g. "_ab")
 *   gga.StarSignProg[i][1]  — claimed flag (1 = claimed, 0 = not claimed)
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
import { gga, readCList } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { useWriteStatus } from "../featureShared.js";

const { div, button, span, h4, p, select, option } = van.tags;

// Player 1..10 → letter
const PLAYER_LETTERS = ["_", "a", "b", "c", "d", "e", "f", "g", "h", "i"];
const letterToPlayer = (l) => PLAYER_LETTERS.indexOf(l) + 1; // 0 if not found
const playerToLetter = (n) => PLAYER_LETTERS[n - 1] ?? null;

// Compute label (A-1, B-3, etc.) for each sign based on its mapId
function computeLabels(quests) {
    const counters = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    return quests.map((q) => {
        const mapId = parseInt(q[0]);
        const g =
            mapId < 50 ? "A" : mapId < 100 ? "B" : mapId < 150 ? "C" : mapId < 200 ? "D" : mapId < 250 ? "E" : "F";
        counters[g]++;
        return `${g}-${counters[g]}`;
    });
}

// Clean description: remove trailing AFK/progress text, replace underscores
const cleanDesc = (s) =>
    (s ?? "")
        .replace(/_@_Progress.*$/, "")
        .replace(/_/g, " ")
        .trim();

// Parse progress string → ordered array of player numbers
const parseProgress = (str) =>
    (str ?? "")
        .split("")
        .map(letterToPlayer)
        .filter((n) => n > 0);

// Encode player list back to string
const encodeProgress = (players) => players.map(playerToLetter).filter(Boolean).join("");
const isUnlockedByProgress = (players, playersNeeded) => players.length >= playersNeeded;

// Get display name for a player slot (1-based)
const playerName = (num, usernames) => usernames[num - 1] ?? `Player ${num}`;

const normalizeNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const DEFAULT_UNLOCKED_STAR_SIGNS = Object.freeze({
    The_Buff_Guy: 1,
    Flexo_Bendo: 1,
    The_Book_Worm: 1,
    The_Fuzzy_Dice: 1,
});

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
            row.addEventListener("dragstart", () => {
                dragIdx = i;
                row.classList.add("dragging");
            });
            row.addEventListener("dragend", () => {
                dragIdx = null;
                row.classList.remove("dragging");
            });
            row.addEventListener("dragover", (e) => {
                e.preventDefault();
                row.classList.add("drag-over");
            });
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
    const players = van.state([...sign.players]);
    const { status, run } = useWriteStatus();
    const progressFill = div({ class: "starsign-progress-fill" });

    van.derive(() => {
        const pct = Math.min(100, (players.val.length / sign.playersNeeded) * 100);
        progressFill.style.setProperty("--starsign-fill-width", `${pct}%`);
    });

    const addPlayer = (num) => {
        if (players.val.includes(num)) return;
        players.val = [...players.val, num];
    };

    const removePlayer = (num) => {
        players.val = players.val.filter((p) => p !== num);
    };

    const doSave = async () => {
        await run(async () => {
            const str = encodeProgress(players.val);
            const path = `StarSignProg[${sign.index}][0]`;
            const ok = await gga(path, str);
            if (!ok) throw new Error(`Write mismatch at ${path}`);
            await onSave?.({ index: sign.index, progress: str });
        });
    };

    return div(
        { class: "starsign-detail" },

        // Header
        div(
            { class: "starsign-detail-header" },
            button({ class: "starsign-back-btn", onclick: onBack }, "← Back"),
            div(
                null,
                h4({ class: "starsign-detail-label" }, sign.label),
                p({ class: "starsign-detail-desc" }, sign.desc)
            ),
            div(
                null,
                span(
                    { class: "starsign-needed-badge" },
                    `${sign.playersNeeded} player${sign.playersNeeded > 1 ? "s" : ""} needed`
                )
            )
        ),

        // Player order list (drag to reorder)
        div({ class: "starsign-section-label" }, "Players who completed this sign (drag to reorder)"),

        () => {
            const list = players.val;
            if (!list.length) return div({ class: "starsign-empty-players" }, "No players added yet");

            return DragList({
                items: list,
                renderItem: (playerNum) => {
                    const row = div(
                        { class: "starsign-player-chip" },
                        span({ class: "starsign-player-num" }, playerName(playerNum, usernames)),
                        span({ class: "starsign-player-letter" }, playerToLetter(playerNum) ?? "?"),
                        button(
                            {
                                class: "starsign-remove-btn",
                                onclick: () => removePlayer(playerNum),
                            },
                            "✕"
                        )
                    );
                    return row;
                },
                onChange: (newOrder) => {
                    players.val = newOrder;
                },
            });
        },

        // Add player row
        div(
            { class: "starsign-add-row" },
            select(
                {
                    id: `add-player-select-${sign.index}`,
                    class: "starsign-player-select select-base",
                },
                option({ value: "", disabled: true, selected: true }, "Add player…"),
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => option({ value: n }, playerName(n, usernames)))
            ),
            button(
                {
                    class: "feature-btn feature-btn--apply",
                    onclick: () => {
                        const sel = document.getElementById(`add-player-select-${sign.index}`);
                        const val = parseInt(sel?.value);
                        if (val && !players.val.includes(val)) {
                            addPlayer(val);
                            sel.value = "";
                        }
                    },
                },
                "ADD"
            )
        ),

        // Progress indicator
        div({ class: "starsign-progress-bar-wrap" }, () => {
            const cur = players.val.length;
            const need = sign.playersNeeded;
            return div(
                null,
                div(
                    { class: "starsign-progress-label" },
                    `${cur} / ${need} players — `,
                    cur >= need
                        ? span({ class: "starsign-unlocked-text" }, "✓ UNLOCKED")
                        : span({ class: "starsign-locked-text" }, "LOCKED")
                ),
                div({ class: "starsign-progress-bar" }, progressFill)
            );
        }),

        // Save button
        div(
            { class: "starsign-detail-actions" },
            button(
                {
                    class: () =>
                        [
                            "feature-btn",
                            "feature-btn--apply",
                            status.val === "loading" ? "feature-btn--loading" : "",
                            status.val === "success" ? "feature-row--success" : "",
                            status.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
                    onclick: doSave,
                    disabled: () => status.val === "loading",
                },
                () => (status.val === "loading" ? "..." : status.val === "success" ? "✓ SAVED" : "SAVE")
            ),
            () =>
                status.val === "error"
                    ? span({ class: "starsign-feature-row--error" }, "Save failed — check game is running")
                    : null
        )
    );
};

// ── Main list card ────────────────────────────────────────────────────────

const StarSignCard = ({ sign, onClick }) => {
    const isUnlocked = sign.unlocked;
    const cur = sign.players.length;
    const need = sign.playersNeeded;
    const pct = Math.min(100, (cur / need) * 100);
    const groupColors = { A: "sign-A", B: "sign-B", C: "sign-C", D: "sign-D", E: "sign-E", F: "sign-F" };
    const groupClass = groupColors[sign.label[0]] ?? "";
    const cardFill = div({ class: "starsign-card-fill" });
    cardFill.style.setProperty("--starsign-fill-width", `${pct}%`);

    return div(
        {
            class: `starsign-card ${isUnlocked ? "starsign-card--unlocked" : ""} ${groupClass}`,
            onclick: () => onClick(sign),
        },
        div(
            { class: "starsign-card-header" },
            span({ class: `starsign-label-badge ${groupClass}` }, sign.label),
            isUnlocked
                ? span({ class: "starsign-status unlocked" }, "✓ UNLOCKED")
                : span({ class: "starsign-status locked" }, `${cur}/${need}`)
        ),
        p({ class: "starsign-card-desc" }, sign.desc),
        div({ class: "starsign-card-bar" }, cardFill)
    );
};

// ── StarSignsTab ──────────────────────────────────────────────────────────

export const StarSignsTab = () => {
    const signs = van.state(null); // array of sign objects
    const loading = van.state(false);
    const error = van.state(null);
    const activeSign = van.state(null); // sign object being edited
    const { status: unlockStatus, run: runUnlock } = useWriteStatus();
    const { status: randomStatus, run: runRandom } = useWriteStatus();
    const { status: resetStatus, run: runReset } = useWriteStatus();
    const isAnyLoading = () =>
        unlockStatus.val === "loading" || randomStatus.val === "loading" || resetStatus.val === "loading";

    const writeAndVerifyClaimed = async (index, claimed) => {
        const expected = claimed ? 1 : 0;
        const path = `StarSignProg[${index}][1]`;
        const ok = await gga(path, expected);
        if (!ok) throw new Error(`Write mismatch at ${path}`);
    };

    const writeAndVerifyOptions40 = async (total) => {
        const expected = normalizeNumber(total, 0);
        const path = "OptionsListAccount[40]";
        const ok = await gga(path, expected);
        if (!ok) throw new Error(`Write mismatch at ${path}`);
    };

    const applyPointsDeltaAndVerify = async (delta) => {
        const current = normalizeNumber(await gga("OptionsListAccount[40]"), 0);
        const next = current + normalizeNumber(delta, 0);
        await writeAndVerifyOptions40(next);
    };

    const resetStarSignsUnlockedToDefault = async () => {
        const path = "StarSignsUnlocked.h";
        const ok = await gga(path, { ...DEFAULT_UNLOCKED_STAR_SIGNS });
        if (!ok) throw new Error(`Write mismatch at ${path}`);
    };

    const load = async () =>
        runAccountLoad({ loading, error, label: "Star Signs" }, async () => {
            const [rawQuests, rawProg, rawUsernames] = await Promise.all([
                readCList("StarQuests"),
                gga("StarSignProg"),
                gga("GetPlayersUsernames"),
            ]);

            const quests = toIndexedArray(rawQuests ?? []);
            const prog = toIndexedArray(rawProg ?? []);
            const labels = computeLabels(quests);
            const usernames = toIndexedArray(rawUsernames ?? []).filter(
                (u) => typeof u === "string" && !u.startsWith("__")
            );

            signs.val = quests
                .map((q, i) => {
                    const playersNeeded = parseInt(q[5]) || 1;
                    const players = parseProgress(prog[i]?.[0]);
                    return {
                        index: i,
                        label: labels[i],
                        desc: cleanDesc(q[7]),
                        playersNeeded,
                        rewardPoints: normalizeNumber(q[6], 0),
                        claimed: Math.round(normalizeNumber(prog[i]?.[1], 0)),
                        players,
                        unlocked: isUnlockedByProgress(players, playersNeeded),
                        usernames,
                    };
                })
                .filter((s) => s.desc.length > 0);
        });

    // After saving from detail, update local state without full reload
    const handleSave = async ({ index, progress }) => {
        if (!signs.val) return;
        const prevSign = signs.val.find((s) => s.index === index);
        const nextSigns = signs.val.map((s) => {
            if (s.index !== index) return s;
            const players = parseProgress(progress);
            return { ...s, players, unlocked: isUnlockedByProgress(players, s.playersNeeded) };
        });
        const updatedSign = nextSigns.find((s) => s.index === index);
        if (updatedSign && prevSign) {
            const wasUnlocked = Boolean(prevSign.unlocked);
            const isUnlocked = Boolean(updatedSign.unlocked);
            if (!wasUnlocked && isUnlocked) {
                await writeAndVerifyClaimed(index, 1);
                await applyPointsDeltaAndVerify(normalizeNumber(updatedSign.rewardPoints, 0));
                updatedSign.claimed = 1;
            } else if (wasUnlocked && !isUnlocked) {
                await writeAndVerifyClaimed(index, 0);
                await applyPointsDeltaAndVerify(-normalizeNumber(updatedSign.rewardPoints, 0));
                updatedSign.claimed = 0;
            } else {
                updatedSign.claimed = Math.round(normalizeNumber(prevSign.claimed, 0));
            }
        }
        signs.val = nextSigns;
        // Also update detail sign
        if (activeSign.val?.index === index) {
            const nextPlayers = parseProgress(progress);
            activeSign.val = {
                ...activeSign.val,
                players: nextPlayers,
                unlocked: isUnlockedByProgress(nextPlayers, activeSign.val.playersNeeded),
                rewardPoints: activeSign.val.rewardPoints ?? updatedSign?.rewardPoints ?? 0,
                claimed: updatedSign?.claimed ?? activeSign.val.claimed ?? 0,
                usernames: activeSign.val?.usernames ?? [],
            };
        }
    };

    load();

    const resetAll = async () => {
        if (!signs.val) return;
        await runReset(async () => {
            const list = signs.val;
            for (const sign of list) {
                const progressPath = `StarSignProg[${sign.index}][0]`;
                const claimedPath = `StarSignProg[${sign.index}][1]`;
                const okProgress = await gga(progressPath, "");
                if (!okProgress) throw new Error(`Write mismatch at ${progressPath}`);
                await new Promise((r) => setTimeout(r, 40));
                const okClaimed = await gga(claimedPath, 0);
                if (!okClaimed) throw new Error(`Write mismatch at ${claimedPath}`);
                await new Promise((r) => setTimeout(r, 40));
            }
            await writeAndVerifyOptions40(0);
            await resetStarSignsUnlockedToDefault();
            const nextSigns = list.map((s) => ({ ...s, players: [], unlocked: false, claimed: 0 }));
            signs.val = nextSigns;
            if (activeSign.val) {
                const updated = nextSigns.find((s) => s.index === activeSign.val.index);
                if (updated) activeSign.val = { ...updated };
            }
        });
    };

    const unlockAll = async (randomize) => {
        if (!signs.val) return;
        const runFn = randomize ? runRandom : runUnlock;
        await runFn(async () => {
            const list = signs.val;
            const nextSigns = [];
            for (const sign of list) {
                const needed = sign.playersNeeded;
                const pool = [...Array(10).keys()].map((n) => n + 1); // [1..10]
                if (randomize) {
                    // Fisher-Yates shuffle
                    for (let i = pool.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [pool[i], pool[j]] = [pool[j], pool[i]];
                    }
                }
                const players = pool.slice(0, needed);
                const str = encodeProgress(players);
                const progressPath = `StarSignProg[${sign.index}][0]`;
                const okProgress = await gga(progressPath, str);
                if (!okProgress) throw new Error(`Write mismatch at ${progressPath}`);
                await new Promise((r) => setTimeout(r, 40));
                nextSigns.push({ ...sign, players, unlocked: true, claimed: 1 });
            }
            let totalDelta = 0;
            for (const sign of list) {
                if (Math.round(normalizeNumber(sign.claimed, 0)) === 0) {
                    totalDelta += normalizeNumber(sign.rewardPoints, 0);
                }
                await writeAndVerifyClaimed(sign.index, 1);
            }
            if (totalDelta !== 0) {
                await applyPointsDeltaAndVerify(totalDelta);
            }
            signs.val = nextSigns;
            if (activeSign.val) {
                const updated = nextSigns.find((s) => s.index === activeSign.val.index);
                if (updated) activeSign.val = { ...updated };
            }
        });
    };

    return AccountPageShell({
        rootClass: "world-feature scroll-container starsigns-scroll-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "STAR SIGNS",
            description: "Assign players (1-10) and drag to reorder completion order",
            actions: [
                withTooltip(
                    button(
                        {
                            class: () =>
                                [
                                    "feature-btn feature-btn--apply",
                                    unlockStatus.val === "loading" ? "feature-btn--loading" : "",
                                    unlockStatus.val === "success" ? "feature-row--success" : "",
                                    unlockStatus.val === "error" ? "feature-row--error" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "),
                            disabled: isAnyLoading,
                            onclick: () => unlockAll(false),
                        },
                        () => (unlockStatus.val === "loading" ? "..." : "UNLOCK ALL")
                    ),
                    "Unlock all signs using players in order: _abcdefghi"
                ),
                withTooltip(
                    button(
                        {
                            class: () =>
                                [
                                    "feature-btn feature-btn--apply",
                                    randomStatus.val === "loading" ? "feature-btn--loading" : "",
                                    randomStatus.val === "success" ? "feature-row--success" : "",
                                    randomStatus.val === "error" ? "feature-row--error" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "),
                            disabled: isAnyLoading,
                            onclick: () => unlockAll(true),
                        },
                        () => (randomStatus.val === "loading" ? "..." : "RANDOMIZE ALL")
                    ),
                    "Unlock all signs with a random player order per sign"
                ),
                withTooltip(
                    button(
                        {
                            class: () =>
                                [
                                    "feature-btn feature-btn--max-reset",
                                    resetStatus.val === "loading" ? "feature-btn--loading" : "",
                                    resetStatus.val === "success" ? "feature-row--success" : "",
                                    resetStatus.val === "error" ? "feature-row--error" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" "),
                            disabled: isAnyLoading,
                            onclick: resetAll,
                        },
                        () => (resetStatus.val === "loading" ? "..." : "RESET ALL")
                    ),
                    "Clear all star sign progress and lock everything"
                ),
                withTooltip(
                    button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                    "Re-read star sign data from game"
                ),
            ],
        }),
        body: () => {
            if (loading.val)
                return div(
                    { class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING STAR SIGNS" }))
                );

            if (error.val)
                return div(
                    { class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "READ FAILED", subtitle: error.val })
                );

            if (!signs.val) return div({ class: "feature-list" });

            // Detail view
            if (activeSign.val)
                return div(
                    { class: "feature-list" },
                    StarSignDetail({
                        sign: activeSign.val,
                        usernames: activeSign.val.usernames ?? [],
                        onSave: handleSave,
                        onBack: () => (activeSign.val = null),
                    })
                );

            // Card grid view
            return div(
                { class: "starsign-grid" },
                ...signs.val.map((sign) =>
                    StarSignCard({
                        sign,
                        onClick: (s) => {
                            activeSign.val = { ...s };
                        },
                    })
                )
            );
        },
    });
};
