/**
 * W3 - Trapping Tab
 *
 * Data sources:
 *   gga.GetPlayersUsernames                              - all character names
 *   gga.UserInfo[0]                                      - currently selected character name
 *   gga.PlayerDATABASE.h[playerName].h.PldTraps         - stored traps per character
 *   gga.PlacedTraps                                      - live traps for currently selected character
 *
 * Trap row shape (t):
 *   t[0] map
 *   t[1] x position
 *   t[2] current elapsed progress
 *   t[3] critter
 *   t[4] qty reward
 *   t[5] trap type
 *   t[6] completion time
 *   t[7] exp reward
 *   t[8] rare chance
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput, getNumberInputLiveRaw } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import { AsyncFeatureBody, toInt, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const unwrap = (value) => (value && typeof value === "object" && "h" in value ? value.h : value);

const cleanName = (raw, fallback = "") =>
    String(raw ?? fallback)
        .replace(/_/g, " ")
        .trim();

const largeFormatter = (raw) => {
    const n = parseNumber(String(raw));
    return n !== null ? formatNumber(n) : String(raw);
};

const largeParser = (display) => {
    const n = parseNumber(display);
    return n !== null ? String(n) : null;
};

const trapStateKey = (playerName, trapIndex, field) => `${playerName}:${trapIndex}:${field}`;
const trapBasePath = (playerName, trapIndex) => `PlayerDATABASE.h[${playerName}].h.PldTraps[${trapIndex}]`;
const progressLabel = (elapsed, completion) => {
    const done = toInt(elapsed, 0);
    const total = Math.max(0, toInt(completion, 0));
    const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((done / total) * 100))) : 0;
    return `Progress: ${done} / ${total} (${pct}%)`;
};

const resolveCritterName = (critterId, itemDefs, monsterDefs) => {
    const raw = critterId ?? "";
    const key = String(raw);
    if (!key) return "Unknown Critter";

    const itemDef = unwrap(itemDefs?.[key] ?? itemDefs?.[raw]);
    const itemName = itemDef?.Name ?? itemDef?.displayName ?? itemDef?.name;
    if (itemName) return cleanName(itemName, key);

    const mobDef = unwrap(monsterDefs?.[key] ?? monsterDefs?.[raw]);
    const mobName = mobDef?.Name ?? mobDef?.displayName ?? mobDef?.name;
    if (mobName) return cleanName(mobName, key);

    return cleanName(raw, key) || key;
};

const TrappingRow = ({ playerName, trap, isCurrentPlayer, getValueState, getInputState, onWriteField }) => {
    const qtyValue = getValueState(playerName, trap.trapIndex, "qty", toInt(trap.qty));
    const expValue = getValueState(playerName, trap.trapIndex, "exp", toInt(trap.exp));
    const rareValue = getValueState(playerName, trap.trapIndex, "rare", toInt(trap.rareChance));
    const elapsedValue = getValueState(playerName, trap.trapIndex, "elapsed", toInt(trap.elapsed));
    const completionValue = getValueState(playerName, trap.trapIndex, "completion", toInt(trap.completionTime));

    const qtyInput = getInputState(playerName, trap.trapIndex, "qty", String(qtyValue.val));
    const expInput = getInputState(playerName, trap.trapIndex, "exp", String(expValue.val));
    const rareInput = getInputState(playerName, trap.trapIndex, "rare", String(rareValue.val));

    const applyStatus = useWriteStatus();
    const finishStatus = useWriteStatus();

    const resolveInputInt = (raw, fallback = 0) => {
        const parsed = parseNumber(raw);
        if (parsed !== null) return Math.max(0, Math.round(parsed));
        const asNumber = Number(raw);
        if (Number.isFinite(asNumber)) return Math.max(0, Math.round(asNumber));
        return Math.max(0, toInt(fallback, 0));
    };
    const latestRaw = (inputState) => {
        const liveRaw = getNumberInputLiveRaw(inputState);
        return liveRaw !== undefined ? liveRaw : inputState.val;
    };

    const statusClass = () => {
        if (applyStatus.status.val === "success" || finishStatus.status.val === "success")
            return "feature-row--success";
        if (applyStatus.status.val === "error" || finishStatus.status.val === "error") return "feature-row--error";
        return "";
    };

    const isBusy = () => applyStatus.status.val === "loading" || finishStatus.status.val === "loading";

    const doApply = async () => {
        const nextQty = resolveInputInt(latestRaw(qtyInput), qtyValue.val);
        const nextExp = resolveInputInt(latestRaw(expInput), expValue.val);
        const nextRare = resolveInputInt(latestRaw(rareInput), rareValue.val);

        await applyStatus.run(async () => {
            await onWriteField(playerName, trap.trapIndex, 4, nextQty, isCurrentPlayer);
            await onWriteField(playerName, trap.trapIndex, 7, nextExp, isCurrentPlayer);
            await onWriteField(playerName, trap.trapIndex, 8, nextRare, isCurrentPlayer);

            qtyValue.val = nextQty;
            expValue.val = nextExp;
            rareValue.val = nextRare;
            qtyInput.val = String(nextQty);
            expInput.val = String(nextExp);
            rareInput.val = String(nextRare);
        });
    };

    const doFinish = async () => {
        const finishAt = toInt(completionValue.val, toInt(trap.completionTime));
        await finishStatus.run(async () => {
            await onWriteField(playerName, trap.trapIndex, 2, finishAt, isCurrentPlayer);
            elapsedValue.val = finishAt;
        });
    };

    return div(
        { class: () => `feature-row trap-row ${statusClass()}` },
        div(
            { class: "feature-row__info trap-row__info" },
            span({ class: "feature-row__index" }, `#${trap.trapIndex + 1}`),
            div(
                { class: "trap-row__text" },
                span({ class: "feature-row__name" }, trap.critterName),
                span({ class: "trap-row__meta" }, () => progressLabel(elapsedValue.val, completionValue.val))
            )
        ),
        span(
            { class: "feature-row__badge trap-row__badge" },
            () =>
                `QTY ${formatNumber(toInt(qtyValue.val))} | EXP ${formatNumber(toInt(expValue.val))} | RARE ${formatNumber(toInt(rareValue.val))}`
        ),
        div(
            { class: "feature-row__controls trap-row__controls" },
            div(
                { class: "trap-row__input-group" },
                span({ class: "trap-row__input-label" }, "Qty"),
                NumberInput({
                    mode: "int",
                    value: qtyInput,
                    formatter: largeFormatter,
                    parser: largeParser,
                    onDecrement: () =>
                        (qtyInput.val = String(Math.max(0, resolveInputInt(latestRaw(qtyInput), 0) - 1))),
                    onIncrement: () => (qtyInput.val = String(resolveInputInt(latestRaw(qtyInput), 0) + 1)),
                })
            ),
            div(
                { class: "trap-row__input-group" },
                span({ class: "trap-row__input-label" }, "EXP"),
                NumberInput({
                    mode: "int",
                    value: expInput,
                    formatter: largeFormatter,
                    parser: largeParser,
                    onDecrement: () =>
                        (expInput.val = String(Math.max(0, resolveInputInt(latestRaw(expInput), 0) - 1))),
                    onIncrement: () => (expInput.val = String(resolveInputInt(latestRaw(expInput), 0) + 1)),
                })
            ),
            div(
                { class: "trap-row__input-group" },
                span({ class: "trap-row__input-label" }, "Rare"),
                NumberInput({
                    mode: "int",
                    value: rareInput,
                    formatter: largeFormatter,
                    parser: largeParser,
                    onDecrement: () =>
                        (rareInput.val = String(Math.max(0, resolveInputInt(latestRaw(rareInput), 0) - 1))),
                    onIncrement: () => (rareInput.val = String(resolveInputInt(latestRaw(rareInput), 0) + 1)),
                })
            ),
            button(
                {
                    type: "button",
                    class: () => `feature-btn feature-btn--apply ${isBusy() ? "feature-btn--loading" : ""}`,
                    disabled: isBusy,
                    onclick: doApply,
                },
                () => (applyStatus.status.val === "loading" ? "..." : "SET")
            ),
            button(
                {
                    type: "button",
                    class: () =>
                        `feature-btn feature-btn--apply trap-row__finish-btn ${isBusy() ? "feature-btn--loading" : ""}`,
                    disabled: isBusy,
                    onclick: doFinish,
                },
                () => (finishStatus.status.val === "loading" ? "..." : "FINISH")
            )
        )
    );
};

const PlayerTrapPanel = ({ player, currentPlayer, getExpandedState, getValueState, getInputState, onWriteField }) => {
    const expanded = getExpandedState(player.playerName);
    const finishAllStatus = useWriteStatus();
    const isCurrentPlayer = currentPlayer === player.playerName;

    const doFinishAll = async () => {
        if (!player.traps.length) return;
        await finishAllStatus.run(async () => {
            for (const trap of player.traps) {
                const completionState = getValueState(
                    player.playerName,
                    trap.trapIndex,
                    "completion",
                    trap.completionTime
                );
                const elapsedState = getValueState(player.playerName, trap.trapIndex, "elapsed", trap.elapsed);
                const finishAt = toInt(completionState.val, toInt(trap.completionTime));
                await onWriteField(player.playerName, trap.trapIndex, 2, finishAt, isCurrentPlayer);
                elapsedState.val = finishAt;
            }
        });
    };

    return div(
        { class: "trap-user-row" },
        button(
            {
                type: "button",
                class: "trap-user-header",
                onclick: () => {
                    expanded.val = !expanded.val;
                },
            },
            span(
                { class: () => `trap-user-header__arrow${expanded.val ? " trap-user-header__arrow--open" : ""}` },
                Icons.ChevronRight()
            ),
            span(
                { class: "trap-user-header__name" },
                player.playerName,
                isCurrentPlayer ? span({ class: "trap-user-header__current" }, " (selected)") : null
            ),
            span({ class: "trap-user-header__count" }, `${player.traps.length} traps`)
        ),
        div(
            { class: () => `trap-user-dropdown${expanded.val ? " trap-user-dropdown--open" : ""}` },
            player.traps.length
                ? div(
                      { class: "trap-user-dropdown__rows" },
                      ...player.traps.map((trap) =>
                          TrappingRow({
                              playerName: player.playerName,
                              trap,
                              isCurrentPlayer,
                              getValueState,
                              getInputState,
                              onWriteField,
                          })
                      )
                  )
                : div(
                      { class: "trap-user-dropdown__empty" },
                      "No valid traps for this character (all map slots are -1)."
                  ),
            div(
                { class: "trap-user-dropdown__footer" },
                button(
                    {
                        type: "button",
                        class: () =>
                            `feature-btn feature-btn--apply trap-user-dropdown__finish-all ${finishAllStatus.status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => finishAllStatus.status.val === "loading" || !player.traps.length,
                        onclick: doFinishAll,
                    },
                    () => (finishAllStatus.status.val === "loading" ? "..." : "FINISH ALL")
                )
            )
        )
    );
};

export const TrappingTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);

    const valueStates = new Map();
    const inputStates = new Map();
    const expandedStates = new Map();

    const getExpandedState = (playerName) => {
        if (!expandedStates.has(playerName)) expandedStates.set(playerName, van.state(false));
        return expandedStates.get(playerName);
    };

    const getValueState = (playerName, trapIndex, field, initialValue = 0) => {
        const key = trapStateKey(playerName, trapIndex, field);
        if (!valueStates.has(key)) valueStates.set(key, van.state(initialValue));
        return valueStates.get(key);
    };

    const getInputState = (playerName, trapIndex, field, initialValue = "0") => {
        const key = trapStateKey(playerName, trapIndex, field);
        if (!inputStates.has(key)) inputStates.set(key, van.state(String(initialValue)));
        return inputStates.get(key);
    };

    const setTrapStatesFromSnapshot = (snapshot) => {
        for (const player of snapshot.players) {
            for (const trap of player.traps) {
                getValueState(player.playerName, trap.trapIndex, "qty", 0).val = toInt(trap.qty);
                getValueState(player.playerName, trap.trapIndex, "exp", 0).val = toInt(trap.exp);
                getValueState(player.playerName, trap.trapIndex, "rare", 0).val = toInt(trap.rareChance);
                getValueState(player.playerName, trap.trapIndex, "elapsed", 0).val = toInt(trap.elapsed);
                getValueState(player.playerName, trap.trapIndex, "completion", 0).val = toInt(trap.completionTime);

                getInputState(player.playerName, trap.trapIndex, "qty", "0").val = String(toInt(trap.qty));
                getInputState(player.playerName, trap.trapIndex, "exp", "0").val = String(toInt(trap.exp));
                getInputState(player.playerName, trap.trapIndex, "rare", "0").val = String(toInt(trap.rareChance));
            }
        }
    };

    const onWriteField = async (playerName, trapIndex, fieldIndex, value, isCurrentPlayer) => {
        if (isCurrentPlayer) {
            await writeGga(`PlacedTraps[${trapIndex}][${fieldIndex}]`, value);
        }
        await writeGga(`${trapBasePath(playerName, trapIndex)}[${fieldIndex}]`, value);
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;

        try {
            const [rawNames, rawCurrentPlayer, rawPlayerDb, rawItemDefs, rawMonsterDefs] = await Promise.all([
                readGga("GetPlayersUsernames"),
                readGga("UserInfo[0]").catch(() => ""),
                readGga("PlayerDATABASE.h"),
                readGga("ItemDefinitionsGET.h").catch(() => ({})),
                readGga("MonsterDefinitionsGET.h").catch(() => ({})),
            ]);

            const playerNames = toIndexedArray(rawNames ?? []).filter(
                (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
            );

            const playerDb = unwrap(rawPlayerDb) || {};
            const itemDefs = unwrap(rawItemDefs) || {};
            const monsterDefs = unwrap(rawMonsterDefs) || {};
            const currentPlayer = typeof rawCurrentPlayer === "string" ? rawCurrentPlayer : "";

            const players = playerNames.map((playerName) => {
                const playerNode = unwrap(playerDb[playerName]) || {};
                const rawTraps = toIndexedArray(playerNode.PldTraps ?? []);
                const traps = rawTraps
                    .map((rawTrap, trapIndex) => {
                        const t = toIndexedArray(rawTrap ?? []);
                        const mapValue = toInt(t[0], -1);
                        if (mapValue === -1) return null;

                        return {
                            trapIndex,
                            map: mapValue,
                            xPos: toInt(t[1], 0),
                            elapsed: toInt(t[2], 0),
                            critterId: t[3],
                            critterName: resolveCritterName(t[3], itemDefs, monsterDefs),
                            qty: toInt(t[4], 0),
                            trapType: toInt(t[5], 0),
                            completionTime: toInt(t[6], 0),
                            exp: toInt(t[7], 0),
                            rareChance: toInt(t[8], 0),
                        };
                    })
                    .filter(Boolean);

                return { playerName, traps };
            });

            const snapshot = { currentPlayer, players };
            setTrapStatesFromSnapshot(snapshot);
            data.val = snapshot;
        } catch (e) {
            error.val = e?.message ?? "Failed to load trapping data";
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    load(true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: (resolved) => !resolved.players.length,
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO PLAYERS",
                subtitle: "No character names were found in GetPlayersUsernames.",
            }),
        renderContent: (resolved) =>
            div(
                { class: "trap-scroll scrollable-panel" },
                div(
                    { class: "trap-note" },
                    "Rare chance note: values above 100 still behave as 100% rare chance and do not grant extra benefit."
                ),
                div(
                    { class: "trap-user-list" },
                    ...resolved.players.map((player) =>
                        PlayerTrapPanel({
                            player,
                            currentPlayer: resolved.currentPlayer,
                            getExpandedState,
                            getValueState,
                            getInputState,
                            onWriteField,
                        })
                    )
                )
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "TRAPPING"),
                p(
                    { class: "feature-header__desc" },
                    "Edit trap quantity, EXP, and rare chance for each player. Finish individual traps or all traps per player."
                )
            ),
            div({ class: "feature-header__actions" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"))
        ),
        renderBody
    );
};
