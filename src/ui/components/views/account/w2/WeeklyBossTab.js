import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span, select, option } = van.tags;

/** Edit Weekly Boss trophies, cosmetic unlocks and each character's main-bar skin. */
export const WeeklyBossTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Weekly Boss" });
    const busy = van.state(false);
    const message = van.state("");
    const trophies = van.state(0);
    const best = van.state(0);
    const activePlayer = van.state(null);
    const bulk = useWriteStatus();
    const skinStates = new Map();
    const playerStates = new Map();
    const skinList = div({ class: "account-item-stack" });
    const playerList = div({ class: "account-item-stack" });
    const reconcileSkins = createStaticRowReconciler(skinList);
    const reconcilePlayers = createStaticRowReconciler(playerList);
    let entries = [];
    let players = [];
    let signature = null;

    const isBusy = () => loading.val || busy.val;
    const cannotWrite = () => isBusy() || Boolean(error.val) || signature === null;
    const playerKey = ({ index, name }) => JSON.stringify([index, name]);

    const readSnapshot = async () => {
        const [rawShop, letters, rawWeekly, rawPlayers, trophyValue, bestValue, active] = await Promise.all([
            readCList("WeeklySHOP[0]"),
            gga("Number2Letter"),
            gga("WeeklyBoss"),
            gga("GetPlayersUsernames"),
            gga("OptionsListAccount[188]"),
            gga("OptionsListAccount[189]"),
            gga("UserInfo[0]").catch(() => null),
        ]);
        const definitions = toIndexedArray(rawShop);
        const weekly = unwrapH(rawWeekly);
        if (
            !definitions.length ||
            Object.keys(rawShop).some((key, index) => Number(key) !== index) ||
            !letters ||
            !weekly ||
            typeof weekly !== "object" ||
            !rawPlayers
        ) {
            throw new Error("Weekly Boss data is unavailable. Refresh to try again.");
        }
        const skins = definitions.map((raw, index) => {
            const definition = toIndexedArray(raw);
            const letter = letters[index + 1];
            const cost = Number(definition[1]);
            if (
                definition.length < 5 ||
                typeof definition[0] !== "string" ||
                !definition[0] ||
                typeof letter !== "string" ||
                !/^[A-Za-z0-9_]+$/.test(letter) ||
                !Number.isFinite(cost) ||
                cost < 0 ||
                Number(definition[4]) !== 0
            ) {
                throw new Error("Weekly Boss skin definitions changed or are invalid. Refresh to try again.");
            }
            const key = `UI_${letter}`;
            if (weekly[key] !== undefined && weekly[key] !== null && ![0, 1].includes(Number(weekly[key]))) {
                throw new Error(`Invalid unlock value for ${cleanName(definition[0])}.`);
            }
            return {
                selection: index + 1,
                key,
                name: cleanName(definition[0]),
                cost,
                image: definition[2],
                description: definition[3] === "filler" ? "" : cleanName(definition[3]),
            };
        });
        if (new Set(skins.map(({ key }) => key)).size !== skins.length) {
            throw new Error("Weekly Boss skin keys are ambiguous. Refresh to try again.");
        }
        const roster = Object.keys(rawPlayers)
            .map((key) => {
                const index = Number(key);
                const name = rawPlayers[key];
                if (!Number.isInteger(index) || index < 0 || typeof name !== "string") {
                    throw new Error("Character roster is invalid. Refresh to try again.");
                }
                return { index, name };
            })
            .filter(({ name }) => name.trim())
            .sort((a, b) => a.index - b.index);
        if (
            !roster.length ||
            trophyValue === null ||
            trophyValue === undefined ||
            bestValue === null ||
            bestValue === undefined ||
            !Number.isInteger(Number(trophyValue)) ||
            Number(trophyValue) < 0 ||
            !Number.isFinite(Number(bestValue))
        ) {
            throw new Error("Weekly Boss trophy, progress or character data is invalid. Refresh to try again.");
        }
        return {
            entries: skins,
            players: roster,
            weekly,
            trophies: Number(trophyValue),
            best: Number(bestValue),
            active,
            signature: JSON.stringify([skins, roster]),
        };
    };

    const syncSnapshot = (snapshot) => {
        trophies.val = snapshot.trophies;
        best.val = snapshot.best;
        activePlayer.val = snapshot.active;
        for (const entry of snapshot.entries) {
            if (!skinStates.has(entry.key)) {
                skinStates.set(entry.key, { unlocked: van.state(false), write: useWriteStatus() });
            }
            skinStates.get(entry.key).unlocked.val = Number(snapshot.weekly[entry.key]) === 1;
        }
        for (const player of snapshot.players) {
            const key = playerKey(player);
            const value = String(snapshot.weekly[`set${player.index}`] ?? 0);
            if (!playerStates.has(key)) {
                playerStates.set(key, { value: van.state(value), draft: van.state(value), write: useWriteStatus() });
            } else {
                const state = playerStates.get(key);
                if (state.draft.val === state.value.val) state.draft.val = value;
                state.value.val = value;
            }
        }
    };

    const readFresh = async () => {
        try {
            const snapshot = await readSnapshot();
            if (snapshot.signature !== signature) {
                throw new Error("Skin definitions or the character roster changed. Refresh before editing.");
            }
            syncSnapshot(snapshot);
            return snapshot;
        } catch (caughtError) {
            error.val = caughtError.message;
            throw caughtError;
        }
    };

    const submitWrites = async (writes) => {
        if (!writes.length) return;
        try {
            if (writes.length === 1) await writeVerified(writes[0].path, writes[0].value);
            else await writeManyVerified(writes);
        } catch (caughtError) {
            const results = caughtError.results || [];
            let verified = 0;
            let failed = 0;
            for (const write of writes) {
                const result = results.find((entry) => entry.path.replace(/^gga\./, "") === write.path);
                if (result?.ok) verified++;
                else if (result?.ok === false) failed++;
                if (write.key) {
                    const state = skinStates.get(write.key);
                    if (result?.ok) state.unlocked.val = write.value === 1;
                }
            }
            try {
                await readFresh();
            } catch {
                // The page read error already blocks further edits until refresh.
            }
            throw new Error(
                `${verified} verified, ${failed} write or verification failures, ` +
                    `${writes.length - verified - failed} without results. ` +
                    `Some changes may have applied. ${caughtError.message}`
            );
        }
        for (const write of writes) {
            if (write.key) {
                const state = skinStates.get(write.key);
                state.unlocked.val = write.value === 1;
            } else if (write.player) {
                const state = playerStates.get(playerKey(write.player));
                state.value.val = String(write.value);
                state.draft.val = String(write.value);
            } else {
                trophies.val = write.value;
            }
        }
        try {
            await readFresh();
        } catch (caughtError) {
            message.val = `Saved and verified, but refresh failed. ${caughtError.message}`;
        }
    };

    const setSkin = async (entry, enabled) => {
        if (cannotWrite()) return;
        busy.val = true;
        message.val = "";
        try {
            await skinStates.get(entry.key).write.run(
                async () => {
                    const snapshot = await readFresh();
                    if ((Number(snapshot.weekly[entry.key]) === 1) === enabled) return;
                    await submitWrites([{ key: entry.key, path: `WeeklyBoss.h.${entry.key}`, value: enabled ? 1 : 0 }]);
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } finally {
            busy.val = false;
        }
    };

    const setAll = async (enabled) => {
        if (cannotWrite()) return;
        busy.val = true;
        message.val = "";
        try {
            const snapshot = await readFresh();
            const targets = entries.filter(({ key }) => (Number(snapshot.weekly[key]) === 1) !== enabled);
            if (!targets.length) {
                message.val = "No skin unlocks need changing.";
                return;
            }
            if (
                !window.confirm(
                    `${enabled ? "Enable" : "Disable"} ${targets.length} cosmetic UI skins? ` +
                        "Trophies and character selections will stay unchanged."
                )
            )
                return;
            await bulk.run(
                async () => {
                    const fresh = await readFresh();
                    const currentTargets = entries.filter(({ key }) => (Number(fresh.weekly[key]) === 1) !== enabled);
                    if (
                        currentTargets.length !== targets.length ||
                        currentTargets.some(({ key }, index) => key !== targets[index].key)
                    ) {
                        throw new Error(
                            "Skin ownership changed while confirmation was open. Review the rows and try again."
                        );
                    }
                    await submitWrites(
                        currentTargets.map(({ key }) => ({
                            key,
                            path: `WeeklyBoss.h.${key}`,
                            value: enabled ? 1 : 0,
                        }))
                    );
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } catch (caughtError) {
            message.val = caughtError.message;
        } finally {
            busy.val = false;
        }
    };

    const savePlayer = async (player) => {
        if (cannotWrite()) return;
        const state = playerStates.get(playerKey(player));
        const draft = state.draft.val;
        busy.val = true;
        message.val = "";
        try {
            await state.write.run(
                async () => {
                    const snapshot = await readFresh();
                    const current = String(snapshot.weekly[`set${player.index}`] ?? 0);
                    if (
                        draft === current &&
                        snapshot.weekly[`set${player.index}`] !== undefined &&
                        snapshot.weekly[`set${player.index}`] !== null
                    )
                        return;
                    const entry = entries.find(({ selection }) => String(selection) === draft);
                    if (draft !== "0" && (!entry || Number(snapshot.weekly[entry.key]) !== 1)) {
                        throw new Error("Select Default or an unlocked skin. Existing selections were preserved.");
                    }
                    await submitWrites([{ player, path: `WeeklyBoss.h.set${player.index}`, value: Number(draft) }]);
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } finally {
            busy.val = false;
        }
    };

    const renderSkin = (entry) => {
        const state = skinStates.get(entry.key);
        return AccountRow({
            rowClass: "account-row--wide-controls",
            status: state.write.status,
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, `${entry.cost} trophies`),
                entry.description ? span({ class: "account-row__sub-label" }, entry.description) : null
            ),
            badge: () => (state.unlocked.val ? "UNLOCKED" : "LOCKED"),
            controls: ActionButton({
                label: () => (state.unlocked.val ? "DISABLE" : "ENABLE"),
                status: state.write.status,
                disabled: cannotWrite,
                tooltip: () => `${state.unlocked.val ? "Disable" : "Enable"} ${entry.name} without spending trophies`,
                onClick: () => setSkin(entry, !state.unlocked.val),
            }),
        });
    };

    const renderPlayer = (player) => {
        const state = playerStates.get(playerKey(player));
        const hasUnknownSelection = () =>
            state.value.val !== "0" && !entries.some(({ selection }) => String(selection) === state.value.val);
        const selectionNode = select(
            {
                class: "select-base",
                "aria-label": `${player.name} main-bar skin`,
                disabled: cannotWrite,
                onchange: (event) => (state.draft.val = event.target.value),
                onkeydown: (event) => {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        void savePlayer(player);
                    }
                },
            },
            option({ value: "0", selected: () => state.draft.val === "0" }, "Default"),
            ...entries.map((entry) =>
                option(
                    {
                        value: String(entry.selection),
                        selected: () => state.draft.val === String(entry.selection),
                        disabled: () =>
                            !skinStates.get(entry.key).unlocked.val && state.value.val !== String(entry.selection),
                    },
                    entry.name
                )
            ),
            option(
                {
                    value: () => state.value.val,
                    hidden: () => !hasUnknownSelection(),
                    disabled: () => !hasUnknownSelection(),
                    selected: () => hasUnknownSelection() && state.draft.val === state.value.val,
                },
                () => `Unknown selection ${state.value.val}`
            )
        );
        return AccountRow({
            rowClass: "account-row--wide-controls",
            status: state.write.status,
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, player.name),
                span({ class: "write-status write-status--error", role: "status" }, () => {
                    if (state.value.val === "0") return "";
                    const entry = entries.find(({ selection }) => String(selection) === state.value.val);
                    return !entry
                        ? `Saved selection ${state.value.val} is unknown.`
                        : !skinStates.get(entry.key).unlocked.val
                          ? `Saved skin ${entry.name} is locked.`
                          : "";
                })
            ),
            badge: () => (activePlayer.val === player.name ? "ACTIVE" : `CHAR ${player.index + 1}`),
            controls: [
                selectionNode,
                ActionButton({
                    label: "SAVE",
                    status: state.write.status,
                    disabled: cannotWrite,
                    tooltip: `Save ${player.name}'s main-bar skin`,
                    onClick: () => savePlayer(player),
                }),
            ],
        });
    };

    const load = () => {
        if (busy.val) return;
        busy.val = true;
        return runLoad(async () => {
            const snapshot = await readSnapshot();
            entries = snapshot.entries;
            players = snapshot.players;
            signature = snapshot.signature;
            syncSnapshot(snapshot);
            reconcileSkins(JSON.stringify(entries), () => entries.map(renderSkin));
            reconcilePlayers(JSON.stringify([entries, players]), () => players.map(renderPlayer));
            message.val = "";
        }).finally(() => (busy.val = false));
    };

    const trophyRow = EditableNumberRow({
        rowClass: "account-row--wide-controls",
        valueState: trophies,
        disabled: cannotWrite,
        normalize: (raw) => {
            const value = Number(raw);
            return String(raw).trim() && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
        },
        write: async (value) => {
            if (cannotWrite())
                throw new Error("Weekly Boss edits are unavailable. Refresh or wait for the current action.");
            busy.val = true;
            message.val = "";
            try {
                await readFresh();
                await submitWrites([{ path: "OptionsListAccount[188]", value }]);
                return trophies.val;
            } catch (caughtError) {
                message.val = caughtError.message;
                throw caughtError;
            } finally {
                busy.val = false;
            }
        },
        renderInfo: () => span({ class: "account-row__name" }, "Trophies"),
        renderBadge: (value) => String(value),
        applyLabel: "SAVE",
        inputProps: { "aria-label": "Weekly Boss trophy balance" },
    });

    load();
    return PersistentAccountListPage({
        title: "WEEKLY BOSS",
        description:
            "Edit trophies and cosmetic main-bar skins. Enable and Disable change unlocks without spending trophies.",
        actions: BulkActionBar({ refresh: { onClick: load, disabled: isBusy } }),
        wrapActions: false,
        state: { loading, error },
        loadingText: "READING WEEKLY BOSS",
        errorTitle: "WEEKLY BOSS READ FAILED",
        body: div(
            { class: "scrollable-panel content-stack" },
            div({ class: "write-status write-status--error", role: "alert" }, () => message.val),
            AccountSection({
                title: "Progress",
                body: [
                    trophyRow,
                    AccountRow({
                        rowClass: "account-row--wide-controls",
                        info: div(
                            { class: "account-row__name-group" },
                            span({ class: "account-row__name" }, "Best stage this week"),
                            span(
                                { class: "account-section__note" },
                                "Resets weekly. Gates stage rewards and contributes to the Weekly Boss damage bonus."
                            )
                        ),
                        badge: () => `${best.val}/5`,
                        controls: span({ class: "write-status" }, "READ ONLY"),
                    }),
                ],
            }),
            AccountSection({
                title: "UI skins",
                note: "Shop prices are shown for reference. Default is free. Disabling an equipped skin preserves its selection.",
                meta: BulkActionBar({
                    actions: [
                        {
                            label: "ENABLE ALL",
                            status: bulk.status,
                            disabled: cannotWrite,
                            onClick: () => setAll(true),
                        },
                        {
                            label: "DISABLE ALL",
                            status: bulk.status,
                            disabled: cannotWrite,
                            onClick: () => setAll(false),
                        },
                    ],
                }),
                body: skinList,
            }),
            AccountSection({
                title: "Character skins",
                note: "Choose Default or an unlocked skin, then Save. Change maps in game to apply the main-bar skin.",
                body: playerList,
            })
        ),
    });
};
