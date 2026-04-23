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
 * Sub-tabs: Miniboss (first), W1-W7.
 * World mob rows expand to reveal per-character kill counts.
 * Miniboss rows are flat account-wide kill counters.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber } from "../../../../utils/numberFormat.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import {
    adjustFormattedIntInput,
    cleanName,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveFormattedIntInput,
    toInt,
    unwrapH,
    writeVerified,
} from "../accountShared.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { renderPersistentPagePanes, renderTabNav } from "../tabShared.js";

const { div, button, span } = van.tags;

const MINIBOSS_WORLD_KEY = "Miniboss";
const WORLD_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
const SENTINEL_PLAYER_NAMES = new Set(["Player", "Current", ""]);

const DN_SUBTABS = [
    { id: "miniboss", label: "MINIBOSS", worldKey: MINIBOSS_WORLD_KEY },
    ...WORLD_LABELS.map((worldKey) => ({ id: worldKey.toLowerCase(), label: worldKey, worldKey })),
];

const playerDbKillsLeftPath = (playerName, mapIndex) =>
    `PlayerDATABASE.h[${playerName}].h.KillsLeft2Advance[${mapIndex}][0]`;
const liveKillsLeftPath = (mapIndex) => `KillsLeft2Advance[${mapIndex}][0]`;

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
    if (worldKey === MINIBOSS_WORLD_KEY) return createMinibossSignature(mobs);
    return `${snapshot?.currentPlayer ?? ""}::${createWorldSignature(mobs)}`;
};

const createPaneStore = (worldKey) => ({
    signature: null,
    listNode: div({ class: `account-list${worldKey === MINIBOSS_WORLD_KEY ? "" : " dn-mob-list"}` }),
});

const KillCountRow = ({ killState, rowClass = "", controlsClass = "", renderInfo, write, onWriteError = null }) =>
    EditableNumberRow({
        valueState: killState,
        normalize: (rawValue) => resolveFormattedIntInput(rawValue, null, { min: 0 }),
        write: async (nextKills) => {
            try {
                return await write(nextKills);
            } catch (error) {
                if (typeof onWriteError === "function") onWriteError(error, nextKills);
                throw error;
            }
        },
        renderInfo,
        renderBadge: (currentValue) => formatNumber(toInt(currentValue)),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass,
        badgeClass: "account-row__badge--highlight",
        controlsClass,
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
        wrapApplyButton: (applyButton) => withTooltip(applyButton, "Write kill count"),
    });

const PlayerKillRow = ({ playerName, killState, isCurrentPlayer, mob }) =>
    KillCountRow({
        killState,
        rowClass: "dn-player-row",
        controlsClass: "account-row__controls--xl",
        renderInfo: () => [
            span({ class: "account-row__name" }, playerName),
            isCurrentPlayer ? span({ class: "dn-player-row__current-tag" }, "YOU") : null,
        ],
        write: async (nextKills) => {
            if (!Number.isInteger(mob.mapIndex) || mob.mapIndex < 0 || mob.required <= 0) {
                throw new Error("Invalid map target for Death Note write");
            }

            const newKillsLeft = mob.required - nextKills;
            const dbPath = playerDbKillsLeftPath(playerName, mob.mapIndex);

            if (isCurrentPlayer) {
                await writeVerified(liveKillsLeftPath(mob.mapIndex), newKillsLeft, {
                    message: `Death Note write mismatch at ${liveKillsLeftPath(mob.mapIndex)}: expected ${newKillsLeft}`,
                });
            }

            await writeVerified(dbPath, newKillsLeft, {
                message: `Death Note write mismatch at ${dbPath}: expected ${newKillsLeft}`,
            });
            return nextKills;
        },
        onWriteError: (error, nextKills) => {
            console.error("[DeathNote][World SET] write failed", {
                playerName,
                mobId: mob.mobId,
                mapIndex: mob.mapIndex,
                required: mob.required,
                requestedKills: nextKills,
                error: error?.message ?? String(error),
            });
        },
    });

const MobRow = ({ mob, getKillState, getExpandState, currentPlayer }) => {
    const expanded = getExpandState(mob.mobId);
    const playerNames = Object.keys(mob.perCharacterKills);
    const totalKills = () => playerNames.reduce((sum, name) => sum + toInt(getKillState(mob.mobId, name).val), 0);
    const playerRows = playerNames.map((name) =>
        PlayerKillRow({
            playerName: name,
            killState: getKillState(mob.mobId, name),
            isCurrentPlayer: name === currentPlayer,
            mob,
        })
    );

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

const MinibossRow = ({ mob, killState }) =>
    KillCountRow({
        killState,
        controlsClass: "account-row__controls--xl",
        renderInfo: () => span({ class: "account-row__name" }, mob.mobName),
        write: async (nextKills) => {
            const path = `Ninja[105][${mob.mobIndex}]`;
            return writeVerified(path, nextKills, {
                message: `Death Note write mismatch at ${path}: expected ${nextKills}`,
            });
        },
    });

const buildStaticMeta = async () => {
    const [rawDeathNoteMobs, rawMapTargets, rawMapDetails, rawMinibossIds] = await Promise.all([
        gga("CustomLists.h.DeathNoteMobs"),
        gga("CustomLists.h.MapAFKtarget"),
        gga("CustomLists.h.MapDetails"),
        gga("CustomLists.h.NinjaInfo[30]"),
    ]);

    const deathNoteGroups = toIndexedArray(rawDeathNoteMobs ?? []);
    const mapTargets = toIndexedArray(rawMapTargets ?? []);
    const mapDetails = toIndexedArray(rawMapDetails ?? []);
    const minibossIds = toIndexedArray(rawMinibossIds ?? [])
        .filter(Boolean)
        .map((mobId) => String(mobId));

    const mapIndexByMobId = new Map();
    mapTargets.forEach((target, mapIndex) => {
        const mobId = String(target ?? "");
        if (!mobId || mapIndexByMobId.has(mobId)) return;
        mapIndexByMobId.set(mobId, mapIndex);
    });

    const getRequired = (mapIndex) => {
        const row = toIndexedArray(mapDetails[mapIndex] ?? []);
        const inner = toIndexedArray(row[0] ?? []);
        return toInt(inner[0] ?? 0);
    };

    const worldMobIds = WORLD_LABELS.flatMap((_, worldIndex) =>
        toIndexedArray(deathNoteGroups[worldIndex] ?? [])
            .filter(Boolean)
            .map((mobId) => String(mobId))
    );
    const allMobIds = Array.from(new Set([...worldMobIds, ...minibossIds]));
    const monsterDefs = allMobIds.length
        ? await readGgaEntries("MonsterDefinitionsGET.h", allMobIds, ["Name", "displayName", "name"])
        : {};

    const getMobName = (mobId) => {
        const def = unwrapH(monsterDefs[mobId]) || {};
        return cleanName(def.Name || def.displayName || def.name || mobId, mobId);
    };

    const worlds = {};
    for (let worldIndex = 0; worldIndex < WORLD_LABELS.length; worldIndex++) {
        const worldKey = WORLD_LABELS[worldIndex];
        const rawGroup = toIndexedArray(deathNoteGroups[worldIndex] ?? []);
        worlds[worldKey] = rawGroup.filter(Boolean).map((rawMobId) => {
            const mobId = String(rawMobId);
            const mapIndex = mapIndexByMobId.get(mobId) ?? -1;
            return {
                type: "world",
                mobId,
                mobName: getMobName(mobId),
                mapIndex,
                required: mapIndex >= 0 ? getRequired(mapIndex) : 0,
            };
        });
    }

    worlds[MINIBOSS_WORLD_KEY] = minibossIds.map((mobId, mobIndex) => ({
        type: "miniboss",
        mobId,
        mobName: getMobName(mobId),
        mobIndex,
    }));

    return { worlds };
};

export const DeathNoteTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Death Note" });
    const activeSubTab = van.state(DN_SUBTABS[0].id);
    const killStates = new Map();
    const expandStates = new Map();
    const paneStores = new Map();
    let staticMeta = null;

    const getKillState = (mobId, playerName) => getOrCreateState(killStates, `${mobId}:${playerName}`);
    const getExpandState = (mobId) => getOrCreateState(expandStates, mobId, false);
    const getPaneStore = (worldKey) => {
        if (!paneStores.has(worldKey)) paneStores.set(worldKey, createPaneStore(worldKey));
        return paneStores.get(worldKey);
    };

    const reconcilePaneRows = (worldKey, snapshot) => {
        const paneStore = getPaneStore(worldKey);
        const signature = createPaneSignature(worldKey, snapshot);
        if (paneStore.signature === signature) return;
        paneStore.signature = signature;

        const mobs = snapshot.worlds[worldKey] ?? [];
        const rows =
            worldKey === MINIBOSS_WORLD_KEY
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

    const load = async () =>
        run(async () => {
            if (!staticMeta) staticMeta = await buildStaticMeta();

            const [currentPlayer, rawPlayerNames, rawKillsLeft, rawMinibossKills] = await Promise.all([
                gga("UserInfo[0]"),
                gga("GetPlayersUsernames"),
                gga("KillsLeft2Advance"),
                gga("Ninja[105]"),
            ]);

            const currentPlayerName = String(currentPlayer ?? "");
            const hasRealCurrentPlayer = !SENTINEL_PLAYER_NAMES.has(currentPlayerName);
            const playerNames = Array.from(
                new Set([
                    ...toIndexedArray(rawPlayerNames ?? [])
                        .filter((name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__"))
                        .map((name) => String(name)),
                    ...(hasRealCurrentPlayer ? [currentPlayerName] : []),
                ])
            );
            const rawPlayerDb = playerNames.length
                ? await readGgaEntries("PlayerDATABASE.h", playerNames, ["KillsLeft2Advance"])
                : {};
            const otherPlayers = playerNames.filter((name) => {
                if (name === currentPlayerName) return false;
                const pdata = unwrapH(rawPlayerDb[name]) || {};
                return pdata.KillsLeft2Advance !== undefined;
            });
            const killsLeftArr = toIndexedArray(rawKillsLeft ?? []);
            const minibossKills = toIndexedArray(rawMinibossKills ?? []);
            const worlds = {};

            const getCurrentKills = (mob) => {
                const left = toInt(toIndexedArray(killsLeftArr[mob.mapIndex] ?? [])[0] ?? mob.required);
                return mob.required - left;
            };

            const getOtherKills = (playerName, mob) => {
                const pdata = unwrapH(rawPlayerDb[playerName]) || {};
                const playerKillsLeft = toIndexedArray(pdata.KillsLeft2Advance ?? []);
                const left = toInt(toIndexedArray(playerKillsLeft[mob.mapIndex] ?? [])[0] ?? mob.required);
                return mob.required - left;
            };

            for (const worldKey of WORLD_LABELS) {
                worlds[worldKey] = (staticMeta.worlds[worldKey] ?? []).map((mob) => {
                    const perCharacterKills = {};
                    if (hasRealCurrentPlayer) {
                        perCharacterKills[currentPlayerName] = mob.mapIndex >= 0 ? getCurrentKills(mob) : 0;
                    }
                    for (const playerName of otherPlayers) {
                        perCharacterKills[playerName] = mob.mapIndex >= 0 ? getOtherKills(playerName, mob) : 0;
                    }

                    return { ...mob, perCharacterKills };
                });
            }

            worlds[MINIBOSS_WORLD_KEY] = (staticMeta.worlds[MINIBOSS_WORLD_KEY] ?? []).map((mob) => ({
                ...mob,
                kills: toInt(minibossKills[mob.mobIndex] ?? 0),
            }));

            for (const worldKey of WORLD_LABELS) {
                for (const mob of worlds[worldKey]) {
                    for (const [playerName, kills] of Object.entries(mob.perCharacterKills)) {
                        getKillState(mob.mobId, playerName).val = toInt(kills);
                    }
                }
            }

            for (const mob of worlds[MINIBOSS_WORLD_KEY]) {
                getKillState(mob.mobId, "_").val = toInt(mob.kills);
            }

            const snapshot = { worlds, currentPlayer: currentPlayerName };
            for (const tab of DN_SUBTABS) {
                reconcilePaneRows(tab.worldKey, snapshot);
            }
        });

    const panes = renderPersistentPagePanes({
        tabs: DN_SUBTABS,
        activeId: activeSubTab,
        paneClass: "account-page-pane",
        hiddenClass: "account-page-pane--hidden",
        dataAttr: "data-deathnote",
        renderContent: (tab) => getPaneStore(tab.worldKey).listNode,
    });

    const body = div(
        { class: "dn-panels" },
        renderTabNav({
            tabs: DN_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-page-nav",
            buttonClass: "account-page-btn",
        }),
        div({ class: "dn-sub-content" }, ...panes)
    );

    load();

    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "DEATH NOTE",
            description: "View kill counts per character for each mob in the Death Note.",
            actions: RefreshButton({
                onRefresh: load,
                disabled: () => loading.val,
                tooltip: "Re-read Death Note kill counts from game memory",
            }),
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING DEATH NOTE",
        persistentErrorTitle: "DEATH NOTE READ FAILED",
        persistentInitialWrapperClass: "account-list",
        body,
    });
};
