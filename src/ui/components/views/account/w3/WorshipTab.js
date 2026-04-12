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
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AsyncFeatureBody, toInt, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

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

const Section = (title, rows) =>
    div(
        { class: "killroy-section" },
        div({ class: "killroy-section__header" }, span({ class: "killroy-section__title" }, title)),
        div({ class: "killroy-rows" }, ...rows)
    );

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

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    "killroy-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, playerName)
        ),
        span({ class: "feature-row__badge" }, () => {
            const current = chargeState.val ?? 0;
            const active = isActiveCharacter();
            const maxLabel =
                active && activeMaxChargeRef.val !== null && activeMaxChargeRef.val !== undefined
                    ? activeMaxChargeRef.val
                    : "?";

            return active ? `CHARGE ${current} / ${maxLabel} - ACTIVE` : `CHARGE ${current}`;
        }),
        div(
            { class: "feature-row__controls" },
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
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: (e) => {
                        e.preventDefault();
                        doSet(inputVal.val);
                    },
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
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

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;

        try {
            const rawNames = await gga("GetPlayersUsernames");
            const playerNames = toIndexedArray(rawNames ?? []).filter(
                (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
            );

            const [playerEntries, activeCharacterName, activeLiveCharge, activeMaxCharge, rawTotemInfo0] =
                await Promise.all([
                    playerNames.length
                        ? readGgaEntries("PlayerDATABASE.h", playerNames, ["PlayerStuff"])
                        : Promise.resolve({}),
                    gga("UserInfo[0]").catch(() => null),
                    gga("PlayerStuff[0]").catch(() => null),
                    readComputed("skillStats", "WorshipChargeMax", []).catch(() => null),
                    gga("TotemInfo[0]").catch(() => []),
                ]);

            activeCharacterNameRef.val = activeCharacterName;
            activeMaxChargeRef.val =
                activeMaxCharge === null || activeMaxCharge === undefined ? null : toInt(activeMaxCharge, { min: 0 });

            const players = playerNames.map((playerName) => {
                const playerStuff = toIndexedArray(playerEntries?.[playerName]?.PlayerStuff ?? []);
                const storedCharge = toInt(playerStuff[0], { min: 0 });

                const charge =
                    typeof activeCharacterName === "string" &&
                    activeCharacterName.length > 0 &&
                    activeCharacterName === playerName
                        ? toInt(activeLiveCharge, { min: 0 })
                        : storedCharge;

                getChargeState(playerName).val = charge;
                return { playerName };
            });

            const totemWaves = toIndexedArray(rawTotemInfo0 ?? []);
            const towerRows = WORSHIP_TOTEM_NAMES.map((name, index) => {
                const wave = toInt(totemWaves[index], { min: 0 });
                getWaveState(index).val = wave;
                return { index, name };
            });

            data.val = { players, towerRows };
        } catch (e) {
            error.val = e?.message ?? "Failed to load worship data";
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
                Section(
                    "WORSHIP CHARGE",
                    resolved.players.map((player, index) =>
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
                Section("TOWER DEFENSE", [
                    ...resolved.towerRows.map((row) =>
                        WorshipWaveRow({
                            index: row.index,
                            name: row.name,
                            waveState: getWaveState(row.index),
                            writeWave,
                        })
                    ),
                ])
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "W3 - WORSHIP"),
                p({ class: "feature-header__desc" }, "Edit worship charge and best worship waves.")
            ),
            div({ class: "feature-header__actions" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"))
        ),
        renderBody
    );
};
