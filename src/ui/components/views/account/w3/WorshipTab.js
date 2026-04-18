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
import { NumberInput } from "../../../NumberInput.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { runAccountLoad } from "../accountLoadPolicy.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { FeatureRow } from "../components/FeatureRow.js";
import { FeatureSection } from "../components/FeatureSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, toInt, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;

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
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(chargeState.val ?? 0);
    });

    const isActiveCharacter = () =>
        typeof activeCharacterNameRef.val === "string" &&
        activeCharacterNameRef.val.length > 0 &&
        activeCharacterNameRef.val === playerName;

    const doSet = async (rawValue) => {
        const next = toInt(rawValue, { min: 0 });

        await run(async () => {
            const verified = await writeCharge(playerName, next);
            chargeState.val = verified;
            inputVal.val = String(verified);
        });
    };

    return FeatureRow({
        rowClass: "killroy-row",
        status,
        info: [
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, playerName),
        ],
        badge: () => {
            const current = chargeState.val ?? 0;
            const active = isActiveCharacter();
            const maxLabel =
                active && activeMaxChargeRef.val !== null && activeMaxChargeRef.val !== undefined
                    ? activeMaxChargeRef.val
                    : "?";

            return active ? `CHARGE ${current} / ${maxLabel} - ACTIVE` : `CHARGE ${current}`;
        },
        controls: [
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, toInt(inputVal.val, { min: 0 }) - 1))),
                onIncrement: () => (inputVal.val = String(toInt(inputVal.val, { min: 0 }) + 1)),
            }),
            button(
                {
                    type: "button",
                    onmousedown: (e) => e.preventDefault(),
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: (e) => {
                        e.preventDefault();
                        doSet(inputVal.val);
                    },
                },
                () => (status.val === "loading" ? "..." : "SET")
            ),
        ],
    });
};

const WorshipWaveRow = ({ index, name, waveState, writeWave }) =>
    EditableNumberRow({
        valueState: waveState,
        normalize: (rawValue) => toInt(rawValue, { min: 0 }),
        write: async (nextWave) => writeWave(index, nextWave),
        renderInfo: () => [
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name),
        ],
        renderBadge: (currentValue) => `BEST WAVE ${currentValue ?? 0}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = toInt(rawValue, { min: 0, fallback: currentValue ?? 0 });
            return Math.max(0, base + delta);
        },
        rowClass: "killroy-row",
    });

export const WorshipTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);

    const activeCharacterNameRef = van.state(null);
    const activeMaxChargeRef = van.state(null);

    const chargeStatesByName = new Map();
    const waveStatesByIndex = new Map();

    const getChargeState = (playerName) => {
        if (!chargeStatesByName.has(playerName)) {
            chargeStatesByName.set(playerName, van.state(0));
        }
        return chargeStatesByName.get(playerName);
    };

    const getWaveState = (index) => {
        if (!waveStatesByIndex.has(index)) {
            waveStatesByIndex.set(index, van.state(0));
        }
        return waveStatesByIndex.get(index);
    };

    const writeCharge = async (playerName, nextCharge) => {
        const isActiveCharacter =
            typeof activeCharacterNameRef.val === "string" &&
            activeCharacterNameRef.val.length > 0 &&
            activeCharacterNameRef.val === playerName;

        const writePath = isActiveCharacter ? "PlayerStuff[0]" : `PlayerDATABASE.h[${playerName}].h.PlayerStuff[0]`;

        const ok = await gga(writePath, nextCharge);
        if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${nextCharge}`);
        return nextCharge;
    };

    const writeWave = async (waveIndex, nextWave) => {
        const writePath = `TotemInfo[0][${waveIndex}]`;
        const ok = await gga(writePath, nextWave);
        if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${nextWave}`);
        return nextWave;
    };

    const load = async () =>
        runAccountLoad(
            { loading, error, label: "Worship" },
            async () => {
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
                    activeMaxCharge === null || activeMaxCharge === undefined
                        ? null
                        : toInt(activeMaxCharge, { min: 0 });

                const nextCharges = [];
                const players = playerNames.map((playerName) => {
                    const playerStuff = toIndexedArray(playerEntries?.[playerName]?.PlayerStuff ?? []);
                    const storedCharge = toInt(playerStuff[0], { min: 0 });

                    const charge =
                        typeof nextActiveCharacterName === "string" &&
                        nextActiveCharacterName.length > 0 &&
                        nextActiveCharacterName === playerName
                            ? toInt(activeLiveCharge, { min: 0 })
                            : storedCharge;

                    nextCharges.push({ playerName, charge });
                    return { playerName };
                });

                const totemWaves = toIndexedArray(rawTotemInfo0 ?? []);
                const nextWaves = [];
                const towerRows = WORSHIP_TOTEM_NAMES.map((name, index) => {
                    const wave = toInt(totemWaves[index], { min: 0 });
                    nextWaves.push({ index, wave });
                    return { index, name };
                });

                activeCharacterNameRef.val = nextActiveCharacterName;
                activeMaxChargeRef.val = nextActiveMaxCharge;
                nextCharges.forEach(({ playerName, charge }) => {
                    getChargeState(playerName).val = charge;
                });
                nextWaves.forEach(({ index, wave }) => {
                    getWaveState(index).val = wave;
                });
                data.val = { players, towerRows };
            }
        );

    load();

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        isEmpty: (resolved) => !resolved.players.length && !resolved.towerRows.length,
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO DATA",
                subtitle: "No worship data found.",
            }),
        renderContent: (resolved) =>
            div(
                { class: "killroy-scroll scrollable-panel" },
                FeatureSection({
                    title: "WORSHIP CHARGE",
                    body: div(
                        { class: "killroy-rows" },
                        ...resolved.players.map((player, index) =>
                            WorshipChargeRow({
                                index,
                                playerName: player.playerName,
                                chargeState: getChargeState(player.playerName),
                                activeCharacterNameRef,
                                activeMaxChargeRef,
                                writeCharge,
                            })
                        )
                    ),
                }),
                FeatureSection({
                    title: "TOWER DEFENSE",
                    body: div(
                        { class: "killroy-rows" },
                        ...resolved.towerRows.map((row) =>
                            WorshipWaveRow({
                                index: row.index,
                                name: row.name,
                                waveState: getWaveState(row.index),
                                writeWave,
                            })
                        )
                    ),
                })
            ),
    });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "W3 - WORSHIP",
            description: "Edit worship charge and best worship waves.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        body: renderBody,
    });
};
