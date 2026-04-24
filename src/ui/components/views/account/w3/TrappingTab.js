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
import { gga, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { formatNumber } from "../../../../utils/numberFormat.js";
import { NumberInput } from "../../../NumberInput.js";
import { EditableFieldsRow } from "../EditableFieldsRow.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountExpandableGroup } from "../components/AccountExpandableGroup.js";
import { ActionButton } from "../components/ActionButton.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveFormattedIntInput,
    toInt,
    unwrapH,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const trapStateKey = (playerName, trapIndex, field) => `${playerName}:${trapIndex}:${field}`;
const trapBasePath = (playerName, trapIndex) => `PlayerDATABASE.h[${playerName}].h.PldTraps[${trapIndex}]`;
const trapShapeSignature = (snapshot) =>
    `${snapshot.currentPlayer}::${snapshot.players
        .map(
            (player) =>
                `${player.playerName}:${player.traps
                    .map((trap) => `${trap.trapIndex}:${trap.critterId}:${trap.map}`)
                    .join(",")}`
        )
        .join("|")}`;

const progressLabel = (elapsed, completion) => {
    const done = toInt(elapsed, 0);
    const total = Math.max(0, toInt(completion, 0));
    const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((done / total) * 100))) : 0;
    return `Progress: ${formatNumber(done)} / ${formatNumber(total)} (${pct}%)`;
};

const resolveCritterName = (critterId, itemDefs, monsterDefs) => {
    const raw = critterId ?? "";
    const key = String(raw);
    if (!key) return "Unknown Critter";

    const itemDef = unwrapH(itemDefs[key] ?? itemDefs[raw]);
    const itemName = itemDef?.Name ?? itemDef?.displayName ?? itemDef?.name;
    if (itemName) return cleanName(itemName, key);

    const mobDef = unwrapH(monsterDefs[key] ?? monsterDefs[raw]);
    const mobName = mobDef?.Name ?? mobDef?.displayName ?? mobDef?.name;
    if (mobName) return cleanName(mobName, key);

    return cleanName(raw, key) || key;
};

const parseTrapRows = (rawTraps) =>
    toIndexedArray(rawTraps ?? [])
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
                qty: toInt(t[4], 0),
                trapType: toInt(t[5], 0),
                completionTime: toInt(t[6], 0),
                exp: toInt(t[7], 0),
                rareChance: toInt(t[8], 0),
            };
        })
        .filter(Boolean);

const TrapInput = ({ label, fieldKey, valueState, draftStates, getDraftValue, setFieldFocused, resetDraft }) =>
    div(
        { class: "trap-row__input-group" },
        span({ class: "trap-row__input-label" }, label),
        NumberInput({
            mode: "int",
            value: draftStates[fieldKey],
            formatter: largeFormatter,
            parser: largeParser,
            onfocus: () => setFieldFocused(fieldKey, true),
            onblur: () => {
                setFieldFocused(fieldKey, false);
                resetDraft(fieldKey);
            },
            onDecrement: () =>
                (draftStates[fieldKey].val = String(
                    adjustFormattedIntInput(getDraftValue(fieldKey), -1, valueState.val, { min: 0 })
                )),
            onIncrement: () =>
                (draftStates[fieldKey].val = String(
                    adjustFormattedIntInput(getDraftValue(fieldKey), 1, valueState.val, { min: 0 })
                )),
        })
    );

const TrappingRow = ({ playerName, trap, isCurrentPlayer, getValueState, onWriteField }) => {
    const qtyValue = getValueState(playerName, trap.trapIndex, "qty", toInt(trap.qty));
    const expValue = getValueState(playerName, trap.trapIndex, "exp", toInt(trap.exp));
    const rareValue = getValueState(playerName, trap.trapIndex, "rare", toInt(trap.rareChance));
    const elapsedValue = getValueState(playerName, trap.trapIndex, "elapsed", toInt(trap.elapsed));
    const completionValue = getValueState(playerName, trap.trapIndex, "completion", toInt(trap.completionTime));
    const finishStatus = useWriteStatus();

    return EditableFieldsRow({
        fields: [
            { key: "qty", valueState: qtyValue },
            { key: "exp", valueState: expValue },
            { key: "rare", valueState: rareValue },
        ],
        normalize: ({ qty, exp, rare }) => {
            const nextQty = resolveFormattedIntInput(qty, null, { min: 0 });
            const nextExp = resolveFormattedIntInput(exp, null, { min: 0 });
            const nextRare = resolveFormattedIntInput(rare, null, { min: 0 });
            if (nextQty === null || nextExp === null || nextRare === null) return null;
            return { qty: nextQty, exp: nextExp, rare: nextRare };
        },
        write: async ({ qty, exp, rare }) => {
            const verifiedQty = await onWriteField(playerName, trap.trapIndex, 4, qty, isCurrentPlayer);
            const verifiedExp = await onWriteField(playerName, trap.trapIndex, 7, exp, isCurrentPlayer);
            const verifiedRare = await onWriteField(playerName, trap.trapIndex, 8, rare, isCurrentPlayer);
            return { qty: verifiedQty, exp: verifiedExp, rare: verifiedRare };
        },
        info: [
            span({ class: "account-row__index" }, `#${trap.trapIndex + 1}`),
            div(
                { class: "trap-row__text" },
                span({ class: "account-row__name" }, trap.critterName),
                span({ class: "trap-row__meta" }, () => progressLabel(elapsedValue.val, completionValue.val))
            ),
        ],
        badge: () =>
            `QTY ${formatNumber(toInt(qtyValue.val))} | EXP ${formatNumber(toInt(expValue.val))} | RARE ${formatNumber(toInt(rareValue.val))}`,
        rowClass: "trap-row",
        badgeClass: "trap-row__badge",
        controlsClass: "trap-row__controls",
        renderControls: ({ draftStates, getDraftValue, setFieldFocused, resetDraft }) => [
            TrapInput({
                label: "Qty",
                fieldKey: "qty",
                valueState: qtyValue,
                draftStates,
                getDraftValue,
                setFieldFocused,
                resetDraft,
            }),
            TrapInput({
                label: "EXP",
                fieldKey: "exp",
                valueState: expValue,
                draftStates,
                getDraftValue,
                setFieldFocused,
                resetDraft,
            }),
            TrapInput({
                label: "Rare",
                fieldKey: "rare",
                valueState: rareValue,
                draftStates,
                getDraftValue,
                setFieldFocused,
                resetDraft,
            }),
        ],
        renderExtraActions: ({ status }) =>
            ActionButton({
                label: "FINISH",
                status: finishStatus.status,
                className: "trap-row__finish-btn",
                disabled: () => status.val === "loading",
                tooltip: "Finish this trap",
                onClick: async (e) => {
                    e.preventDefault();
                    const finishAt = toInt(completionValue.val, toInt(trap.completionTime));
                    const { ok, result } = await finishStatus.run(async () =>
                        onWriteField(playerName, trap.trapIndex, 2, finishAt, isCurrentPlayer)
                    );
                    if (ok) elapsedValue.val = result;
                },
            }),
    });
};

const PlayerTrapPanel = ({ player, currentPlayer, getExpandedState, getValueState, onWriteField }) => {
    const expanded = getExpandedState(player.playerName);
    const isCurrentPlayer = currentPlayer === player.playerName;
    const rows = player.traps.map((trap) =>
        TrappingRow({
            playerName: player.playerName,
            trap,
            isCurrentPlayer,
            getValueState,
            onWriteField,
        })
    );

    return AccountExpandableGroup({
        expanded,
        title: [player.playerName, isCurrentPlayer ? span({ class: "trap-user-current" }, "(selected)") : null],
        meta: () => `${player.traps.length} traps`,
        body: div({ class: "trap-user-dropdown__rows" }, ...rows),
    });
};

export const TrappingTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Trapping" });
    const finishAllStatus = useWriteStatus();
    const trapCountState = van.state(0);
    const valueStates = new Map();
    const expandedStates = new Map();
    const critterNameById = new Map();
    const playersNode = div({ class: "trap-user-list" });
    let latestSnapshot = { currentPlayer: "", players: [] };
    const reconcilePlayerPanels = createStaticRowReconciler(playersNode);

    const getExpandedState = (playerName) => getOrCreateState(expandedStates, playerName, false);
    const getValueState = (playerName, trapIndex, field, initialValue = 0) =>
        getOrCreateState(valueStates, trapStateKey(playerName, trapIndex, field), initialValue);

    const setTrapStatesFromSnapshot = (snapshot) => {
        for (const player of snapshot.players) {
            for (const trap of player.traps) {
                getValueState(player.playerName, trap.trapIndex, "qty", 0).val = toInt(trap.qty);
                getValueState(player.playerName, trap.trapIndex, "exp", 0).val = toInt(trap.exp);
                getValueState(player.playerName, trap.trapIndex, "rare", 0).val = toInt(trap.rareChance);
                getValueState(player.playerName, trap.trapIndex, "elapsed", 0).val = toInt(trap.elapsed);
                getValueState(player.playerName, trap.trapIndex, "completion", 0).val = toInt(trap.completionTime);
            }
        }
    };

    const reconcilePlayers = (snapshot) => {
        latestSnapshot = snapshot;
        trapCountState.val = snapshot.players.reduce((sum, player) => sum + player.traps.length, 0);
        setTrapStatesFromSnapshot(snapshot);

        reconcilePlayerPanels(
            trapShapeSignature(snapshot),
            () =>
                snapshot.players.map((player) =>
                    PlayerTrapPanel({
                        player,
                        currentPlayer: snapshot.currentPlayer,
                        getExpandedState,
                        getValueState,
                        onWriteField,
                    })
                )
        );
    };

    const onWriteField = async (playerName, trapIndex, fieldIndex, value, isCurrentPlayer) => {
        if (isCurrentPlayer) {
            await writeVerified(`PlacedTraps[${trapIndex}][${fieldIndex}]`, value, {
                message: `Write mismatch at PlacedTraps[${trapIndex}][${fieldIndex}]: expected ${value}`,
            });
        }

        const dbPath = `${trapBasePath(playerName, trapIndex)}[${fieldIndex}]`;
        return writeVerified(dbPath, value, { message: `Write mismatch at ${dbPath}: expected ${value}` });
    };

    const finishAllTraps = async () => {
        if (!trapCountState.val) return;

        await finishAllStatus.run(async () => {
            for (const player of latestSnapshot.players) {
                const isCurrentPlayer = player.playerName === latestSnapshot.currentPlayer;

                for (const trap of player.traps) {
                    const completionState = getValueState(player.playerName, trap.trapIndex, "completion", 0);
                    const finishAt = toInt(completionState.val, toInt(trap.completionTime));
                    const verifiedElapsed = await onWriteField(
                        player.playerName,
                        trap.trapIndex,
                        2,
                        finishAt,
                        isCurrentPlayer
                    );
                    getValueState(player.playerName, trap.trapIndex, "elapsed", 0).val = verifiedElapsed;
                }
            }
        });
    };

    const loadCritterNames = async (critterIds) => {
        const missingCritterIds = critterIds.filter((critterId) => !critterNameById.has(critterId));
        if (!missingCritterIds.length) return;

        const [itemDefs, monsterDefs] = await Promise.all([
            readGgaEntries("ItemDefinitionsGET.h", missingCritterIds, ["Name", "displayName", "name"]),
            readGgaEntries("MonsterDefinitionsGET.h", missingCritterIds, ["Name", "displayName", "name"]),
        ]);

        for (const critterId of missingCritterIds) {
            critterNameById.set(critterId, resolveCritterName(critterId, itemDefs, monsterDefs));
        }
    };

    const load = async () =>
        run(async () => {
            const [rawNames, rawCurrentPlayer] = await Promise.all([gga("GetPlayersUsernames"), gga("UserInfo[0]")]);
            const playerNames = toIndexedArray(rawNames ?? []).filter(
                (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
            );
            const currentPlayer = typeof rawCurrentPlayer === "string" ? rawCurrentPlayer : "";

            const [playerEntries, liveTraps] = await Promise.all([
                playerNames.length ? readGgaEntries("PlayerDATABASE.h", playerNames, ["PldTraps"]) : {},
                currentPlayer ? gga("PlacedTraps") : [],
            ]);

            const playersWithRawTraps = playerNames.map((playerName) => {
                const playerNode = unwrapH(playerEntries[playerName]) || {};
                const rawTraps = playerName === currentPlayer ? liveTraps : playerNode.PldTraps;
                return { playerName, traps: parseTrapRows(rawTraps) };
            });
            const critterIds = [
                ...new Set(
                    playersWithRawTraps
                        .flatMap((player) => player.traps.map((trap) => String(trap.critterId ?? "")))
                        .filter(Boolean)
                ),
            ];
            await loadCritterNames(critterIds);

            reconcilePlayers({
                currentPlayer,
                players: playersWithRawTraps.map((player) => ({
                    playerName: player.playerName,
                    traps: player.traps.map((trap) => ({
                        ...trap,
                        critterName: critterNameById.get(String(trap.critterId ?? "")) ?? "Unknown Critter",
                    })),
                })),
            });
        });

    load();

    return PersistentAccountListPage({
        title: "TRAPPING",
        description: "Edit trap quantity, EXP, and rare chance for each player. Finish individual traps or all traps per player.",
        actions: [
            ActionButton({
                label: "FINISH ALL",
                status: finishAllStatus.status,
                disabled: () => loading.val || !trapCountState.val,
                tooltip: "Finish every loaded trap",
                onClick: (e) => {
                    e.preventDefault();
                    finishAllTraps();
                },
            }),
            RefreshButton({ onRefresh: load }),
        ],
        topNotices: WarningBanner(
            "Rare chance values above 100 still behave as 100% rare chance and do not grant extra benefit."
        ),
        body: div({ class: "trap-scroll scrollable-panel" }, playersNode),
        rootClass: "tab-container scroll-container",
        state: { loading, error },
        loadingText: "Loading Trapping...",
        errorTitle: "TRAPPING LOAD FAILED",
    });
};
