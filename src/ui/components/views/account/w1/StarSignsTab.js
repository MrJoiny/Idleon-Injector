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
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { ActionButton } from "../components/ActionButton.js";
import { toInt, toNum, useWriteStatus, writeManyVerified } from "../accountShared.js";

const { div, button, span, h4, p, select, option } = van.tags;

// Player 1..10 → letter
const PLAYER_LETTERS = ["_", "a", "b", "c", "d", "e", "f", "g", "h", "i"];
const PLAYER_NUMBERS = PLAYER_LETTERS.map((_, index) => index + 1);
const letterToPlayer = (l) => PLAYER_LETTERS.indexOf(l) + 1; // 0 if not found
const playerToLetter = (n) => PLAYER_LETTERS[n - 1] ?? null;

// Compute label (A-1, B-3, etc.) for each sign based on its mapId
function computeLabels(quests) {
    const counters = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    return quests.map((q) => {
        const mapId = parseInt(q[0], 10);
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
const playerName = (num, usernames) => {
    const name = usernames[num - 1];
    return typeof name === "string" && name.trim() && !name.startsWith("__") ? name : `Player ${num}`;
};

const normalizeUsernames = (rawUsernames) => {
    const source = rawUsernames?.h ?? rawUsernames;
    return PLAYER_NUMBERS.map((num) => {
        const index = num - 1;
        if (Array.isArray(source)) return source[index];
        return source?.[index] ?? source?.[String(index)];
    });
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

    return div(
        { class: "starsign-drag-list" },
        ...items.map((item, i) =>
            div(
                {
                    class: "starsign-drag-row",
                    draggable: true,
                    ondragstart: (e) => {
                        dragIdx = i;
                        e.currentTarget.classList.add("dragging");
                    },
                    ondragend: (e) => {
                        dragIdx = null;
                        e.currentTarget.classList.remove("dragging");
                    },
                    ondragover: (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("drag-over");
                    },
                    ondragleave: (e) => e.currentTarget.classList.remove("drag-over"),
                    ondrop: (e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("drag-over");
                        if (dragIdx === null || dragIdx === i) return;
                        const next = [...items];
                        const [moved] = next.splice(dragIdx, 1);
                        next.splice(i, 0, moved);
                        onChange(next);
                    },
                },
                div({ class: "starsign-drag-handle" }, "⠿"),
                renderItem(item, i)
            )
        )
    );
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
                ...PLAYER_NUMBERS.map((n) => option({ value: n }, playerName(n, usernames)))
            ),
            button(
                {
                    class: "account-btn account-btn--apply",
                    onclick: () => {
                        const sel = document.getElementById(`add-player-select-${sign.index}`);
                        const val = parseInt(sel?.value, 10);
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
            ActionButton({
                label: () => (status.val === "success" ? "✓ SAVED" : "SAVE"),
                status,
                tooltip: "Write star sign progress to game memory",
                onClick: doSave,
            }),
            () =>
                status.val === "error"
                    ? span({ class: "write-status write-status--error" }, "Save failed — check game is running")
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

const getClaimedRewardTotal = (list) =>
    list.reduce((total, sign) => total + (toInt(sign.claimed, 0) ? toNum(sign.rewardPoints, 0) : 0), 0);

const syncActiveSign = (activeSign, nextSigns) => {
    if (!activeSign.val) return;
    const updated = nextSigns.find((sign) => sign.index === activeSign.val.index);
    if (updated) activeSign.val = { ...updated };
    else activeSign.val = null;
};

// ── StarSignsTab ──────────────────────────────────────────────────────────

export const StarSignsTab = () => {
    const signs = van.state(null); // array of sign objects
    const { loading, error, run } = useAccountLoad({ label: "Star Signs" });
    const activeSign = van.state(null); // sign object being edited
    const { status: unlockStatus, run: runUnlock } = useWriteStatus();
    const { status: randomStatus, run: runRandom } = useWriteStatus();
    const { status: resetStatus, run: runReset } = useWriteStatus();
    const isAnyLoading = () =>
        unlockStatus.val === "loading" || randomStatus.val === "loading" || resetStatus.val === "loading";

    const load = async () =>
        run(async () => {
            const [rawQuests, rawProg, rawUsernames] = await Promise.all([
                readCList("StarQuests"),
                gga("StarSignProg"),
                gga("GetPlayersUsernames"),
            ]);

            const quests = toIndexedArray(rawQuests ?? []);
            const prog = toIndexedArray(rawProg ?? []);
            const labels = computeLabels(quests);
            const usernames = normalizeUsernames(rawUsernames);

            const nextSigns = quests
                .map((q, i) => {
                    const playersNeeded = parseInt(q[5], 10) || 1;
                    const players = parseProgress(prog[i]?.[0]);
                    return {
                        index: i,
                        label: labels[i],
                        desc: cleanDesc(q[7]),
                        playersNeeded,
                        rewardPoints: toNum(q[6], 0),
                        claimed: toInt(prog[i]?.[1], 0),
                        players,
                        unlocked: isUnlockedByProgress(players, playersNeeded),
                        usernames,
                    };
                })
                .filter((s) => s.desc.length > 0);

            signs.val = nextSigns;
            syncActiveSign(activeSign, nextSigns);
        });

    const handleSave = async ({ index, progress }) => {
        if (!signs.val) return;

        try {
            const list = signs.val;
            const sign = list.find((entry) => entry.index === index);
            if (!sign) return;

            const players = parseProgress(progress);
            const unlocked = isUnlockedByProgress(players, sign.playersNeeded);
            const claimed = unlocked ? 1 : 0;
            const nextSigns = list.map((entry) =>
                entry.index === index
                    ? {
                          ...entry,
                          players,
                          unlocked,
                          claimed,
                      }
                    : entry
            );

            const writes = [];
            if (progress !== encodeProgress(sign.players)) {
                writes.push({ path: `StarSignProg[${sign.index}][0]`, value: progress });
            }
            if (toInt(sign.claimed, 0) !== claimed) {
                writes.push({ path: `StarSignProg[${sign.index}][1]`, value: claimed });
            }

            const currentTotal = getClaimedRewardTotal(list);
            const nextTotal = getClaimedRewardTotal(nextSigns);
            if (nextTotal !== currentTotal) {
                writes.push({ path: "OptionsListAccount[40]", value: nextTotal });
            }

            await writeManyVerified(writes);

            signs.val = nextSigns;
            syncActiveSign(activeSign, nextSigns);
        } catch (error) {
            await load();
            throw error;
        }
    };

    load();

    const resetAll = async () => {
        if (!signs.val) return;
        await runReset(async () => {
            try {
                const list = signs.val;
                const nextSigns = list.map((sign) => ({ ...sign, players: [], unlocked: false, claimed: 0 }));
                const writes = [];

                for (const sign of list) {
                    if ((sign.players?.length ?? 0) > 0) {
                        writes.push({ path: `StarSignProg[${sign.index}][0]`, value: "" });
                    }
                    if (toInt(sign.claimed, 0) !== 0) {
                        writes.push({ path: `StarSignProg[${sign.index}][1]`, value: 0 });
                    }
                }

                if (getClaimedRewardTotal(list) !== 0) {
                    writes.push({ path: "OptionsListAccount[40]", value: 0 });
                }

                writes.push({ path: "StarSignsUnlocked.h", value: { ...DEFAULT_UNLOCKED_STAR_SIGNS } });

                await writeManyVerified(writes);

                signs.val = nextSigns;
                syncActiveSign(activeSign, nextSigns);
            } catch (error) {
                await load();
                throw error;
            }
        });
    };

    const unlockAll = async (randomize) => {
        if (!signs.val) return;
        const runFn = randomize ? runRandom : runUnlock;
        await runFn(async () => {
            try {
                const list = signs.val;
                const writes = [];
                const nextSigns = list.map((sign) => {
                    const pool = [...PLAYER_NUMBERS];
                    if (randomize) {
                        for (let i = pool.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [pool[i], pool[j]] = [pool[j], pool[i]];
                        }
                    }

                    const players = pool.slice(0, sign.playersNeeded);
                    const progress = encodeProgress(players);
                    if (progress !== encodeProgress(sign.players)) {
                        writes.push({ path: `StarSignProg[${sign.index}][0]`, value: progress });
                    }
                    if (toInt(sign.claimed, 0) !== 1) {
                        writes.push({ path: `StarSignProg[${sign.index}][1]`, value: 1 });
                    }

                    return { ...sign, players, unlocked: true, claimed: 1 };
                });

                const currentTotal = getClaimedRewardTotal(list);
                const nextTotal = getClaimedRewardTotal(nextSigns);
                if (nextTotal !== currentTotal) {
                    writes.push({ path: "OptionsListAccount[40]", value: nextTotal });
                }

                await writeManyVerified(writes);

                signs.val = nextSigns;
                syncActiveSign(activeSign, nextSigns);
            } catch (error) {
                await load();
                throw error;
            }
        });
    };

    const renderBody = () => {
        const resolved = signs.val;
        if (!resolved) return null;

        if (resolved.length === 0) {
            return EmptyState({
                icon: Icons.SearchX(),
                title: "NO STAR SIGN DATA",
                subtitle: "Ensure the game is running, then hit REFRESH",
            });
        }

        if (activeSign.val) {
            return div(
                { class: "account-list" },
                StarSignDetail({
                    sign: activeSign.val,
                    usernames: activeSign.val.usernames ?? [],
                    onSave: handleSave,
                    onBack: () => (activeSign.val = null),
                })
            );
        }

        return div(
            { class: "starsign-grid" },
            ...resolved.map((sign) =>
                StarSignCard({
                    sign,
                    onClick: (selectedSign) => {
                        activeSign.val = { ...selectedSign };
                    },
                })
            )
        );
    };

    return PersistentAccountListPage({
        rootClass: "tab-container scroll-container starsigns-scroll-container",
        title: "STAR SIGNS",
        description: "Assign players (1-10) and drag to reorder completion order",
        actions: [
            ActionButton({
                label: "UNLOCK ALL",
                status: unlockStatus,
                disabled: isAnyLoading,
                tooltip: "Unlock all signs using players in order: _abcdefghi",
                onClick: () => unlockAll(false),
            }),
            ActionButton({
                label: "RANDOMIZE ALL",
                status: randomStatus,
                disabled: isAnyLoading,
                tooltip: "Unlock all signs with a random player order per sign",
                onClick: () => unlockAll(true),
            }),
            ActionButton({
                label: "RESET ALL",
                status: resetStatus,
                variant: "max-reset",
                disabled: isAnyLoading,
                tooltip: "Clear all star sign progress and lock everything",
                onClick: resetAll,
            }),
            RefreshButton({
                onRefresh: load,
                tooltip: "Re-read star sign data from game",
            }),
        ],
        state: { loading, error },
        body: renderBody,
    });
};
