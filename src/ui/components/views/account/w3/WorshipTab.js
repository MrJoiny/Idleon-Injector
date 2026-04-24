/**
 * W3 - Worship Tab
 *
 * Data sources:
 *   gga.GetPlayersUsernames                          - all character names
 *   gga.PlayerDATABASE.h[charName].h.PlayerStuff[0] - stored worship charge for charName
 *   gga.PlayerStuff[0]                               - active character live current worship charge
 *   gga.UserInfo[0]                                  - active character name
 *   gga.TotemInfo[0][trialIndex]                     - max wave achieved for worship trialIndex
 *
 * Important write rule:
 *   If gga.UserInfo[0] equals the target character name, write to
 *   gga.PlayerStuff[0] instead of the PlayerDATABASE entry to avoid snap-back.
 *
 * Worship max charge:
 *   Live max charge is computed by:
 *     x._customBlock_SkillStats("WorshipChargeMax")
 *   This tab reads it through readComputed("skillStats", "WorshipChargeMax", []).
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, gga, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { createStaticRowReconciler, getOrCreateState, toInt, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const WORSHIP_TOTEM_NAMES = [
    "Goblin Gorefest",
    "Wakawaka War",
    "Acorn Assault",
    "Frosty Firefight",
    "Clash of Cans",
    "Citric Conflict",
    "Breezy Battle",
    "Pufferblob Brawl",
];

const WorshipChargeRow = ({
    index,
    playerName,
    chargeState,
    activeCharacterNameRef,
    activeMaxChargeRef,
    writeCharge,
}) => {
    const isActiveCharacter = () =>
        typeof activeCharacterNameRef.val === "string" &&
        activeCharacterNameRef.val.length > 0 &&
        activeCharacterNameRef.val === playerName;

    return EditableNumberRow({
        valueState: chargeState,
        normalize: (rawValue) => toInt(rawValue, { min: 0 }),
        write: async (nextCharge) => writeCharge(playerName, nextCharge),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${index + 1}`),
            span({ class: "account-row__name" }, playerName),
        ],
        renderBadge: (currentValue) => {
            const active = isActiveCharacter();
            const maxLabel =
                active && activeMaxChargeRef.val !== null && activeMaxChargeRef.val !== undefined
                    ? activeMaxChargeRef.val
                    : "?";

            return active ? `CHARGE ${currentValue ?? 0} / ${maxLabel} - ACTIVE` : `CHARGE ${currentValue ?? 0}`;
        },
        adjustInput: (rawValue, delta, currentValue) => {
            const base = toInt(rawValue, { min: 0, fallback: currentValue ?? 0 });
            return Math.max(0, base + delta);
        },
        controlsClass: "account-row__controls--xl",
    });
};

const WorshipWaveRow = ({ index, name, waveState, writeWave }) =>
    EditableNumberRow({
        valueState: waveState,
        normalize: (rawValue) => toInt(rawValue, { min: 0 }),
        write: async (nextWave) => writeWave(index, nextWave),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${index + 1}`),
            span({ class: "account-row__name" }, name),
        ],
        renderBadge: (currentValue) => `BEST WAVE ${currentValue ?? 0}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = toInt(rawValue, { min: 0, fallback: currentValue ?? 0 });
            return Math.max(0, base + delta);
        },
    });

export const WorshipTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Worship" });
    const activeCharacterNameRef = van.state(null);
    const activeMaxChargeRef = van.state(null);

    const chargeStatesByName = new Map();
    const waveStatesByIndex = new Map();

    const getChargeState = (playerName) => getOrCreateState(chargeStatesByName, playerName);
    const getWaveState = (index) => getOrCreateState(waveStatesByIndex, index);

    const writeCharge = async (playerName, nextCharge) => {
        const isActiveCharacter =
            typeof activeCharacterNameRef.val === "string" &&
            activeCharacterNameRef.val.length > 0 &&
            activeCharacterNameRef.val === playerName;

        const writePath = isActiveCharacter ? "PlayerStuff[0]" : `PlayerDATABASE.h[${playerName}].h.PlayerStuff[0]`;

        return writeVerified(writePath, nextCharge, { message: `Write mismatch at ${writePath}: expected ${nextCharge}` });
    };

    const writeWave = async (waveIndex, nextWave) => {
        const writePath = `TotemInfo[0][${waveIndex}]`;
        return writeVerified(writePath, nextWave, { message: `Write mismatch at ${writePath}: expected ${nextWave}` });
    };

    const chargeRowsNode = div({ class: "content-stack" });
    const reconcilePlayerRows = createStaticRowReconciler(chargeRowsNode);

    const reconcileChargeRows = (players) =>
        reconcilePlayerRows(
            players.map((player) => player.playerName).join("|"),
            () =>
                players.map((player, index) =>
                    WorshipChargeRow({
                        index,
                        playerName: player.playerName,
                        chargeState: getChargeState(player.playerName),
                        activeCharacterNameRef,
                        activeMaxChargeRef,
                        writeCharge,
                    })
                )
        );

    const waveRowsNode = div(
        { class: "content-stack" },
        ...WORSHIP_TOTEM_NAMES.map((name, index) =>
            WorshipWaveRow({
                index,
                name,
                waveState: getWaveState(index),
                writeWave,
            })
        )
    );

    const load = async () =>
        run(async () => {
            const rawNames = await gga("GetPlayersUsernames");
            const playerNames = toIndexedArray(rawNames ?? []).filter(
                (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
            );

            const [playerEntries, activeCharacterName, activeLiveCharge, activeMaxCharge, rawTotemInfo0] =
                await Promise.all([
                    playerNames.length
                        ? readGgaEntries("PlayerDATABASE.h", playerNames, ["PlayerStuff"])
                        : Promise.resolve({}),
                    gga("UserInfo[0]"),
                    gga("PlayerStuff[0]"),
                    readComputed("skillStats", "WorshipChargeMax", []),
                    gga("TotemInfo[0]"),
                ]);

            const nextActiveCharacterName = activeCharacterName;
            const nextActiveMaxCharge =
                activeMaxCharge === null || activeMaxCharge === undefined ? null : toInt(activeMaxCharge, { min: 0 });
            const players = playerNames.map((playerName) => ({ playerName }));

            activeCharacterNameRef.val = nextActiveCharacterName;
            activeMaxChargeRef.val = nextActiveMaxCharge;
            reconcileChargeRows(players);

            for (const playerName of playerNames) {
                const playerStuff = toIndexedArray(playerEntries?.[playerName]?.PlayerStuff ?? []);
                const storedCharge = toInt(playerStuff[0], { min: 0 });
                const charge =
                    typeof nextActiveCharacterName === "string" &&
                    nextActiveCharacterName.length > 0 &&
                    nextActiveCharacterName === playerName
                        ? toInt(activeLiveCharge, { min: 0 })
                        : storedCharge;

                getChargeState(playerName).val = charge;
            }

            const totemWaves = toIndexedArray(rawTotemInfo0 ?? []);
            for (let i = 0; i < WORSHIP_TOTEM_NAMES.length; i++) {
                getWaveState(i).val = toInt(totemWaves[i], { min: 0 });
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "WORSHIP CHARGE",
            body: chargeRowsNode,
        }),
        AccountSection({
            title: "TOWER DEFENSE",
            body: waveRowsNode,
        })
    );

    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "W3 - WORSHIP",
            description: "Edit worship charge and best worship waves.",
            actions: RefreshButton({ onRefresh: load }),
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING WORSHIP",
        persistentErrorTitle: "WORSHIP READ FAILED",
        persistentInitialWrapperClass: "scrollable-panel",
        body,
    });
};


