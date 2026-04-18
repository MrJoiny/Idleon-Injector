/**
 * W3 - Death Note Tab
 *
 * World mob data sources:
 *   gga.CustomLists.h.DeathNoteMobs[worldIndex]           - array of mob IDs per world (W1=0 … W7=6)
 *   gga.CustomLists.h.MapAFKtarget[mapIndex]              - mob ID at a given map index
 *   gga.CustomLists.h.MapDetails[mapIndex][0][0]          - required kills for that map (Death Note goal)
 *   gga.KillsLeft2Advance[mapIndex][0]                    - kills remaining for current character
 *   gga.PlayerDATABASE[playerName].KillsLeft2Advance[mapIndex][0]
 *                                                         - kills remaining for other characters
 *
 * Miniboss data sources:
 *   gga.CustomLists.h.NinjaInfo[30]             - array of miniboss mob IDs
 *   gga.Ninja[105]                              - array of kill counts (one per miniboss, account-wide)
 *   gga.MonsterDefinitionsGET.h[mobId].Name     - mob display name
 *
 * Sub-tabs: Miniboss (first), W1 … W7.
 * World mob rows expand to reveal per-character kill counts.
 * Miniboss rows are flat: name and kill badge only.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import {
    cleanName,
    largeFormatter,
    largeParser,
    renderFeatureError,
    renderFeatureLoading,
    toInt,
    unwrapH,
    useWriteStatus,
} from "../featureShared.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { renderLazyPanes, renderTabNav } from "../tabShared.js";

const { div, button, span } = van.tags;

// ── helpers ───────────────────────────────────────────────────────────────────

const playerDbKillsLeftPath = (playerName, mapIndex) =>
    `PlayerDATABASE.h[${playerName}].h.KillsLeft2Advance[${mapIndex}][0]`;
const liveKillsLeftPath = (mapIndex) => `KillsLeft2Advance[${mapIndex}][0]`;

// Persistent local store so remounts do not recreate all state and cause snapback.
const dnStore = {
    didInit: false,
    killStateMap: new Map(),
    expandStateMap: new Map(),
    paneStoreMap: new Map(),
};

// ── sub-tab definitions ───────────────────────────────────────────────────────

const WORLD_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];

const DN_SUBTABS = [
    { id: "miniboss", label: "MINIBOSS", worldKey: "Miniboss" },
    ...WORLD_LABELS.map((w) => ({ id: w.toLowerCase(), label: w, worldKey: w })),
];

// ── PlayerKillRow (world mobs only) ───────────────────────────────────────────

const PlayerKillRow = ({ playerName, killState, isCurrentPlayer, mob }) => {
    const inputVal = van.state(String(toInt(killState.val)));
    const { status, run } = useWriteStatus();
    let isFocused = false;

    van.derive(() => {
        const v = killState.val;
        if (v !== undefined && !isFocused) inputVal.val = String(toInt(v));
    });

    const resolveNum = (raw) => {
        const n = parseNumber(raw);
        if (n !== null) return Math.round(n);
        const num = Number(raw);
        return isNaN(num) ? null : Math.round(num);
    };

    const doSet = async (raw) => {
        const num = resolveNum(raw);
        if (num === null) return;
        await run(
            async () => {
                if (!Number.isInteger(mob.mapIndex) || mob.mapIndex < 0 || mob.required <= 0) {
                    throw new Error("Invalid map target for Death Note write");
                }

                const newKillsLeft = mob.required - num;
                const dbPath = playerDbKillsLeftPath(playerName, mob.mapIndex);

                if (isCurrentPlayer) {
                    const liveOk = await gga(liveKillsLeftPath(mob.mapIndex), newKillsLeft);
                    if (!liveOk)
                        throw new Error(
                            `Death Note write mismatch at ${liveKillsLeftPath(mob.mapIndex)}: expected ${newKillsLeft}`
                        );
                }

                const dbOk = await gga(dbPath, newKillsLeft);
                if (!dbOk) throw new Error(`Death Note write mismatch at ${dbPath}: expected ${newKillsLeft}`);

                killState.val = String(num);
                inputVal.val = String(num);
            },
            {
                onError: (error) => {
                    console.error("[DeathNote][World SET] write failed", {
                        playerName,
                        mobId: mob.mobId,
                        mapIndex: mob.mapIndex,
                        required: mob.required,
                        requestedKills: num,
                        error: error?.message ?? String(error),
                    });
                },
            }
        );
    };

    return div(
        {
            class: () =>
                `dn-player-row ${status.val === "success" ? "feature-row--success" : ""} ${status.val === "error" ? "feature-row--error" : ""}`,
        },
        span(
            { class: "dn-player-row__name" },
            playerName,
            isCurrentPlayer ? span({ class: "dn-player-row__current-tag" }, " (you)") : null
        ),
        span({ class: "feature-row__badge feature-row__badge--highlight" }, () => formatNumber(toInt(killState.val))),
        div(
            { class: "dn-player-row__controls" },
            NumberInput({
                value: inputVal,
                mode: "int",
                formatter: largeFormatter,
                parser: largeParser,
                onfocus: () => {
                    isFocused = true;
                },
                onblur: () => {
                    isFocused = false;
                },
                onDecrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(Math.max(0, cur - 1));
                },
                onIncrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(cur + 1);
                },
            }),
            withTooltip(
                button(
                    {
                        type: "button",
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Write kill count"
            )
        )
    );
};

// ── MobRow (world mobs) ───────────────────────────────────────────────────────

const MobRow = ({ mob, getKillState, getExpandState, currentPlayer }) => {
    const expanded = getExpandState(mob.mobId);
    const playerNames = Object.keys(mob.perCharacterKills);

    const totalKills = () => playerNames.reduce((sum, name) => sum + toInt(getKillState(mob.mobId, name).val), 0);

    const playerRows = playerNames.map((name) => {
        const isCurrentPlayer = name === currentPlayer;
        return PlayerKillRow({
            playerName: name,
            killState: getKillState(mob.mobId, name),
            isCurrentPlayer,
            mob,
        });
    });

    return div(
        { class: "dn-mob-row" },
        button(
            {
                type: "button",
                class: "dn-mob-header",
                onclick: () => {
                    expanded.val = !expanded.val;
                },
            },
            span(
                { class: () => `dn-mob-header__arrow${expanded.val ? " dn-mob-header__arrow--open" : ""}` },
                Icons.ChevronRight()
            ),
            span({ class: "dn-mob-header__name" }, mob.mobName),
            span({ class: "dn-mob-header__total" }, () => formatNumber(totalKills()))
        ),
        div({ class: () => `dn-mob-dropdown${expanded.val ? " dn-mob-dropdown--open" : ""}` }, ...playerRows)
    );
};

// ── MinibossRow ───────────────────────────────────────────────────────────────

const MinibossRow = ({ mob, killState }) => {
    const inputVal = van.state(String(toInt(killState.val)));
    const { status, run } = useWriteStatus();
    let isFocused = false;

    van.derive(() => {
        const v = killState.val;
        if (v !== undefined && !isFocused) inputVal.val = String(toInt(v));
    });

    const resolveNum = (raw) => {
        const n = parseNumber(raw);
        if (n !== null) return Math.round(n);
        const num = Number(raw);
        return isNaN(num) ? null : Math.round(num);
    };

    const doSet = async (raw) => {
        const num = resolveNum(raw);
        if (num === null) return;
        await run(async () => {
            const path = `Ninja[105][${mob.mobIndex}]`;
            const ok = await gga(path, num);
            if (!ok) throw new Error(`Death Note write mismatch at ${path}: expected ${num}`);
            killState.val = String(num);
            inputVal.val = String(num);
        });
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${status.val === "error" ? "feature-row--error" : ""}`,
        },
        div({ class: "feature-row__info" }, span({ class: "feature-row__name" }, mob.mobName)),
        span({ class: "feature-row__badge feature-row__badge--highlight" }, () => formatNumber(toInt(killState.val))),
        div(
            { class: "feature-row__controls feature-row__controls--xl" },
            NumberInput({
                value: inputVal,
                mode: "int",
                formatter: largeFormatter,
                parser: largeParser,
                onfocus: () => {
                    isFocused = true;
                },
                onblur: () => {
                    isFocused = false;
                },
                onDecrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(Math.max(0, cur - 1));
                },
                onIncrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(cur + 1);
                },
            }),
            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Write kill count"
            )
        )
    );
};

// ── WorldPanel ────────────────────────────────────────────────────────────────

const createWorldSignature = (mobs) =>
    (mobs ?? [])
        .map((mob) => {
            const players = Object.keys(mob.perCharacterKills ?? {})
                .sort()
                .join(",");
            return `${mob.mobId}|${players}`;
        })
        .join("||");

const createMinibossSignature = (mobs) => (mobs ?? []).map((mob) => String(mob.mobId)).join("|");

const createPaneSignature = (worldKey, snapshot) => {
    const mobs = snapshot?.worlds?.[worldKey] ?? [];
    if (worldKey === "Miniboss") return createMinibossSignature(mobs);
    return `${snapshot?.currentPlayer ?? ""}::${createWorldSignature(mobs)}`;
};

const createPaneStore = (worldKey) => ({
    signature: null,
    listNode: div({ class: `feature-list${worldKey === "Miniboss" ? "" : " dn-mob-list"}` }),
});

const WorldPanel = ({ worldKey, loading, error, data, getPaneStore, reconcilePaneRows }) => {
    const isMiniboss = worldKey === "Miniboss";
    const paneStore = getPaneStore(worldKey);

    van.derive(() => {
        if (loading.val || error.val || !data.val) return;
        reconcilePaneRows(worldKey, data.val);
    });

    return div(
        { class: "dn-world-panel" },
        () => (loading.val ? div({ class: "feature-list" }, renderFeatureLoading()) : null),
        () => (!loading.val && error.val ? div({ class: "feature-list" }, renderFeatureError(error.val)) : null),
        () => {
            if (loading.val || error.val) return null;
            const hasRows = !!(data.val && data.val.worlds?.[worldKey]?.length > 0);
            if (hasRows) return null;
            return div(
                { class: "feature-list" },
                EmptyState({
                    icon: Icons.SearchX(),
                    title: isMiniboss ? "NO MINIBOSS DATA" : "NO DATA",
                    subtitle: isMiniboss
                        ? "No miniboss entries found."
                        : `No Death Note entries found for ${worldKey}.`,
                })
            );
        },
        div(
            {
                class: () => {
                    const hasRows = !!(data.val && data.val.worlds?.[worldKey]?.length > 0);
                    return hasRows && !loading.val && !error.val ? "" : "is-hidden-until-ready";
                },
            },
            paneStore.listNode
        )
    );
};

// ── DeathNoteTab ──────────────────────────────────────────────────────────────

export const DeathNoteTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);

    const getKillState = (mobId, playerName) => {
        const key = `${mobId}:${playerName}`;
        if (!dnStore.killStateMap.has(key)) dnStore.killStateMap.set(key, van.state("0"));
        return dnStore.killStateMap.get(key);
    };

    const getExpandState = (mobId) => {
        if (!dnStore.expandStateMap.has(mobId)) dnStore.expandStateMap.set(mobId, van.state(false));
        return dnStore.expandStateMap.get(mobId);
    };

    const getPaneStore = (worldKey) => {
        if (!dnStore.paneStoreMap.has(worldKey)) dnStore.paneStoreMap.set(worldKey, createPaneStore(worldKey));
        return dnStore.paneStoreMap.get(worldKey);
    };

    const reconcilePaneRows = (worldKey, snapshot) => {
        const paneStore = getPaneStore(worldKey);
        const signature = createPaneSignature(worldKey, snapshot);
        if (paneStore.signature === signature) return;
        paneStore.signature = signature;

        const mobs = snapshot?.worlds?.[worldKey] ?? [];
        const rows =
            worldKey === "Miniboss"
                ? mobs.map((mob) => MinibossRow({ mob, killState: getKillState(mob.mobId, "_") }))
                : mobs.map((mob) =>
                      MobRow({
                          mob,
                          getKillState,
                          getExpandState,
                          currentPlayer: snapshot.currentPlayer,
                      })
                  );

        paneStore.listNode.replaceChildren(...rows);
    };

    const load = async () => {
        if (loading.val) return undefined;

        return runAccountLoad(
            {
                loading,
                error,
                label: "Death Note",
            },
            async () => {
                const [
                    rawDeathNoteMobs,
                    rawMapTargets,
                    rawMapDetails,
                    rawMonsterDefs,
                    currentPlayer,
                    rawPlayerNames,
                    rawKillsLeft,
                    rawPlayerDb,
                    rawMinibossIds,
                    rawMinibossKills,
                ] = await Promise.all([
                    gga("CustomLists.h.DeathNoteMobs"),
                    gga("CustomLists.h.MapAFKtarget"),
                    gga("CustomLists.h.MapDetails"),
                    gga("MonsterDefinitionsGET.h"),
                    gga("UserInfo[0]"),
                    gga("GetPlayersUsernames"),
                    gga("KillsLeft2Advance"),
                    gga("PlayerDATABASE"),
                    gga("CustomLists.h.NinjaInfo[30]"),
                    gga("Ninja[105]"),
                ]);

                const deathNoteGroups = toIndexedArray(rawDeathNoteMobs ?? []);
                const mapTargets = toIndexedArray(rawMapTargets ?? []);
                const mapDetails = toIndexedArray(rawMapDetails ?? []);
                const monsterDefs = unwrapH(rawMonsterDefs) || {};
                const killsLeftArr = toIndexedArray(rawKillsLeft ?? []);
                const playerDb = unwrapH(rawPlayerDb) || {};
                const minibossIds = toIndexedArray(rawMinibossIds ?? []);
                const minibossKills = toIndexedArray(rawMinibossKills ?? []);
                const playerNamesFromList = toIndexedArray(rawPlayerNames ?? []).filter(
                    (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
                );

                const currentPlayerName = String(currentPlayer ?? "");
                const SENTINEL_NAMES = new Set(["Player", "Current", ""]);
                const hasRealCurrentPlayer = !SENTINEL_NAMES.has(currentPlayerName);
                const candidateNames = Array.from(new Set([...playerNamesFromList, ...Object.keys(playerDb)]))
                    .map((name) => String(name))
                    .filter((name) => name.trim().length > 0 && !name.startsWith("__"))
                    .filter((name) => {
                        if (name === currentPlayerName) return true;
                        const pdata = unwrapH(playerDb[name]) || {};
                        return pdata && pdata.KillsLeft2Advance !== undefined;
                    });
                const otherPlayers = candidateNames.filter((name) => name !== currentPlayerName);

                const getMobName = (mobId) => {
                    const def = unwrapH(monsterDefs[mobId]) || {};
                    return cleanName(def.Name || def.displayName || def.name || mobId, mobId);
                };

                const mapIndexByMobId = new Map();
                mapTargets.forEach((target, mapIndex) => {
                    const key = String(target ?? "");
                    if (!key || mapIndexByMobId.has(key)) return;
                    mapIndexByMobId.set(key, mapIndex);
                });

                const getRequired = (mapIndex) => {
                    const row = toIndexedArray(mapDetails[mapIndex] ?? []);
                    const inner = toIndexedArray(row[0] ?? []);
                    return toInt(inner[0] ?? 0);
                };

                const getCurrentKills = (mapIndex) => {
                    const required = getRequired(mapIndex);
                    const left = toInt(toIndexedArray(killsLeftArr[mapIndex] ?? [])[0] ?? required);
                    return required - left;
                };

                const getOtherKills = (playerName, mapIndex) => {
                    const required = getRequired(mapIndex);
                    const pdata = unwrapH(playerDb[playerName]) || {};
                    const playerKillsLeft = toIndexedArray(pdata.KillsLeft2Advance ?? []);
                    const left = toInt(toIndexedArray(playerKillsLeft[mapIndex] ?? [])[0] ?? required);
                    return required - left;
                };

                const worlds = {};

                for (let worldIndex = 0; worldIndex < WORLD_LABELS.length; worldIndex++) {
                    const worldKey = WORLD_LABELS[worldIndex];
                    const rawGroup = toIndexedArray(deathNoteGroups[worldIndex] ?? []);

                    worlds[worldKey] = rawGroup.filter(Boolean).map((mobId) => {
                        const mapIndex = mapIndexByMobId.get(String(mobId)) ?? -1;
                        const required = mapIndex >= 0 ? getRequired(mapIndex) : 0;

                        const perCharacterKills = {};
                        if (hasRealCurrentPlayer) {
                            perCharacterKills[currentPlayerName] = mapIndex >= 0 ? getCurrentKills(mapIndex) : 0;
                        }
                        for (const name of otherPlayers) {
                            perCharacterKills[name] = mapIndex >= 0 ? getOtherKills(name, mapIndex) : 0;
                        }

                        return {
                            type: "world",
                            mobId,
                            mobName: getMobName(mobId),
                            mapIndex,
                            required,
                            perCharacterKills,
                        };
                    });
                }

                worlds.Miniboss = minibossIds.filter(Boolean).map((mobId, index) => ({
                    type: "miniboss",
                    mobId,
                    mobName: getMobName(mobId),
                    mobIndex: index,
                    kills: toInt(minibossKills[index] ?? 0),
                }));

                for (const worldKey of WORLD_LABELS) {
                    for (const mob of worlds[worldKey] ?? []) {
                        for (const [name, kills] of Object.entries(mob.perCharacterKills)) {
                            const key = `${mob.mobId}:${name}`;
                            const value = String(toInt(kills));
                            if (dnStore.killStateMap.has(key)) dnStore.killStateMap.get(key).val = value;
                            else dnStore.killStateMap.set(key, van.state(value));
                        }
                    }
                }

                for (const mob of worlds.Miniboss) {
                    const key = `${mob.mobId}:_`;
                    const value = String(mob.kills);
                    if (dnStore.killStateMap.has(key)) dnStore.killStateMap.get(key).val = value;
                    else dnStore.killStateMap.set(key, van.state(value));
                }

                data.val = {
                    worlds,
                    currentPlayer: currentPlayerName,
                };
            }
        );
    };

    if (!dnStore.didInit) {
        dnStore.didInit = true;
        queueMicrotask(() => load());
    }

    const activeSubTab = van.state(DN_SUBTABS[0].id);

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "DEATH NOTE",
            description: "View kill counts per character for each mob in the Death Note.",
            actions: button({ type: "button", class: "btn-secondary", disabled: loading, onclick: load }, "REFRESH"),
        }),
        body: div(
            { class: "dn-panels" },
            renderTabNav({
                tabs: DN_SUBTABS,
                activeId: activeSubTab,
                navClass: "alchemy-sub-nav",
                buttonClass: "alchemy-sub-btn",
            }),
            div(
                { class: "alchemy-sub-content" },
                ...renderLazyPanes({
                    tabs: DN_SUBTABS,
                    activeId: activeSubTab,
                    paneClass: "alchemy-pane",
                    activeClass: "alchemy-pane--active",
                    dataAttr: "data-deathnote",
                    renderContent: (tab) =>
                        WorldPanel({
                            worldKey: tab.worldKey,
                            loading,
                            error,
                            data,
                            getPaneStore,
                            reconcilePaneRows,
                        }),
                })
            )
        ),
    });
};
