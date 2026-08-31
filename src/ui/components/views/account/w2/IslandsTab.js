/**
 * W2 - Islands Tab
 *
 * Native controls for the Fishing Islands fields in OptionsListAccount.
 * Island unlocks are stored as a compact token string in [169].
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { BulkActionBar, SetAllNumberControl } from "../BulkActionBar.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountToggleRow } from "../components/AccountToggleRow.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    getOrCreateState,
    resolveNumberInput,
    runBulkSet,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const UNLOCK_PATH = "OptionsListAccount[169]";
const ISLANDS = [
    { token: "_", label: "Trash Island" },
    { token: "a", label: "Rando Island" },
    { token: "b", label: "Crystal Island" },
    { token: "c", label: "Seasalt Island" },
    { token: "d", label: "Shimmer Island" },
    { token: "e", label: "Fractal Isle" },
];
const CANONICAL_UNLOCK_ORDER = "abcde_";

const CURRENCY_FIELDS = [
    { index: 161, name: "Garbage Currency" },
    { index: 162, name: "Bottles Currency" },
    { index: 170, name: "Uncollected Bottles" },
];
const GARBAGE_FIELDS = [
    { index: 163, name: "% Garbage" },
    { index: 164, name: "% Bottles" },
];
const RANDO_FIELDS = [
    { index: 166, name: "% Loot" },
    { index: 167, name: "% Double Boss" },
];
const SHIMMER_FIELDS = [
    { index: 174, name: "Base STR" },
    { index: 175, name: "Base AGI" },
    { index: 176, name: "Base WIS" },
    { index: 177, name: "Base LUK" },
    { index: 178, name: "% Total Damage" },
    { index: 179, name: "% Class EXP" },
    { index: 180, name: "% Skill Efficiency" },
];
const ALL_OPTION_INDICES = [
    ...CURRENCY_FIELDS,
    ...GARBAGE_FIELDS,
    ...RANDO_FIELDS,
    { index: 165 },
    { index: 169 },
    { index: 172 },
    { index: 173 },
    ...SHIMMER_FIELDS,
    { index: 184 },
].map(({ index }) => index);

const canonicalizeUnlocks = (rawValue) => {
    const raw = String(rawValue ?? "");
    return [...CANONICAL_UNLOCK_ORDER].filter((token) => raw.includes(token)).join("");
};

const IslandUnlockRow = ({ island, unlocksState, writeUnlocks }) =>
    AccountToggleRow({
        info: div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, island.label)),
        badge: () => (unlocksState.val.includes(island.token) ? "UNLOCKED" : "LOCKED"),
        checked: () => unlocksState.val.includes(island.token),
        title: `Toggle ${island.label}`,
        write: async (enabled) => {
            const current = canonicalizeUnlocks(unlocksState.val);
            const next = canonicalizeUnlocks(enabled ? `${current}${island.token}` : current.replace(island.token, ""));
            await writeUnlocks(next);
        },
    });

const NumericRow = ({ field, valueState, badge }) =>
    SimpleNumberRow({
        entry: {
            ...field,
            path: `OptionsListAccount[${field.index}]`,
            min: 0,
            badge,
            showIndex: false,
        },
        valueState,
    });

export const IslandsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Islands" });
    const unlockBulk = useWriteStatus();
    const garbageBulk = useWriteStatus();
    const randoBulk = useWriteStatus();
    const shimmerBulk = useWriteStatus();
    const valueStates = new Map();
    const unlocksState = van.state("");
    const bribeState = van.state(0);
    const garbageSetAll = van.state("200");
    const randoSetAll = van.state("200");
    const shimmerSetAll = van.state("200");

    const getValueState = (index) => getOrCreateState(valueStates, index);

    const load = async () =>
        runLoad(async () => {
            const values = await readGgaEntries("OptionsListAccount", ALL_OPTION_INDICES.map(String));
            unlocksState.val = canonicalizeUnlocks(values["169"]);
            bribeState.val = Number(values["165"] ?? 0) === 1 ? 1 : 0;

            ALL_OPTION_INDICES.filter((index) => ![165, 169].includes(index)).forEach((index) => {
                getValueState(index).val = Math.max(0, Math.round(Number(values[String(index)] ?? 0) || 0));
            });
        });

    const writeUnlocks = async (nextValue, { batch = false } = {}) => {
        const canonical = canonicalizeUnlocks(nextValue);
        if (batch) {
            await writeManyVerified([{ path: UNLOCK_PATH, value: canonical }]);
        } else {
            await writeVerified(UNLOCK_PATH, canonical, { write: gga });
        }
        unlocksState.val = canonical;
    };

    const setAll = async (fields, inputState, status) => {
        const target = resolveNumberInput(inputState.val, { min: 0, fallback: null });
        if (target === null) return;

        await status.run(() =>
            runBulkSet({
                entries: fields,
                getTargetValue: () => target,
                getValueState: (field) => getValueState(field.index),
                getPath: (field) => `OptionsListAccount[${field.index}]`,
            })
        );
    };

    load();

    const content = div(
        { class: "islands-content scrollable-panel content-stack" },
        AccountSection({
            title: "ISLAND UNLOCKS",
            meta: BulkActionBar({
                actions: [
                    {
                        label: "UNLOCK ALL",
                        status: unlockBulk.status,
                        tooltip: "Write the canonical unlock string abcde_",
                        onClick: () => unlockBulk.run(() => writeUnlocks(CANONICAL_UNLOCK_ORDER, { batch: true })),
                    },
                    {
                        label: "LOCK ALL",
                        status: unlockBulk.status,
                        tooltip: "Clear every island unlock",
                        onClick: () => unlockBulk.run(() => writeUnlocks("", { batch: true })),
                    },
                ],
            }),
            body: div(
                { class: "islands-unlock-list" },
                ...ISLANDS.map((island) => IslandUnlockRow({ island, unlocksState, writeUnlocks }))
            ),
        }),
        AccountSection({
            title: "CURRENCIES & UNCOLLECTED",
            body: div(
                { class: "account-list" },
                ...CURRENCY_FIELDS.map((field) => NumericRow({ field, valueState: getValueState(field.index) }))
            ),
        }),
        AccountSection({
            title: "GARBAGE UPGRADES",
            meta: div(
                { class: "islands-section__controls" },
                SetAllNumberControl({
                    label: "SET ALL",
                    value: garbageSetAll,
                    status: garbageBulk.status,
                    onApply: () => setAll(GARBAGE_FIELDS, garbageSetAll, garbageBulk),
                })
            ),
            body: div(
                { class: "account-list" },
                ...GARBAGE_FIELDS.map((field) => NumericRow({ field, valueState: getValueState(field.index) })),
                AccountToggleRow({
                    info: div(
                        { class: "account-row__name-group" },
                        span({ class: "account-row__name" }, "Emporium Bonus Bribe")
                    ),
                    badge: () => (bribeState.val ? "ENABLED" : "DISABLED"),
                    checked: () => bribeState.val === 1,
                    title: "Toggle Emporium Bonus Bribe",
                    write: async (enabled) => {
                        const next = enabled ? 1 : 0;
                        await writeVerified("OptionsListAccount[165]", next, { write: gga });
                        bribeState.val = next;
                    },
                })
            ),
        }),
        AccountSection({
            title: "RANDO UPGRADES",
            meta: div(
                { class: "islands-section__controls" },
                SetAllNumberControl({
                    label: "SET ALL",
                    value: randoSetAll,
                    status: randoBulk.status,
                    onApply: () => setAll(RANDO_FIELDS, randoSetAll, randoBulk),
                })
            ),
            body: div(
                { class: "account-list" },
                ...RANDO_FIELDS.map((field) => NumericRow({ field, valueState: getValueState(field.index) }))
            ),
        }),
        AccountSection({
            title: "SHIMMER STATUS & UPGRADES",
            meta: div(
                { class: "islands-section__controls" },
                SetAllNumberControl({
                    label: "SET UPGRADES",
                    value: shimmerSetAll,
                    status: shimmerBulk.status,
                    onApply: () => setAll(SHIMMER_FIELDS, shimmerSetAll, shimmerBulk),
                })
            ),
            body: div(
                { class: "account-list" },
                NumericRow({
                    field: { index: 172, name: "Shimmer Island Dummy DPS" },
                    valueState: getValueState(172),
                }),
                NumericRow({
                    field: { index: 173, name: "Shimmers Currency" },
                    valueState: getValueState(173),
                }),
                ...SHIMMER_FIELDS.map((field) => NumericRow({ field, valueState: getValueState(field.index) }))
            ),
        }),
        AccountSection({
            title: "FRACTAL ISLE",
            body: div(
                { class: "account-list" },
                NumericRow({
                    field: { index: 184, name: "Fractal Isle AFK Time (Hours)" },
                    valueState: getValueState(184),
                    badge: (hours) => `${hours ?? 0}h`,
                })
            ),
        })
    );

    return PersistentAccountListPage({
        rootClass: "islands-tab tab-container",
        title: "ISLANDS",
        description: "Manage Fishing Islands unlocks, currencies, upgrades, and AFK time.",
        wrapActions: false,
        actions: BulkActionBar({
            refresh: {
                onClick: load,
                disabled: () => loading.val,
                tooltip: "Re-read Islands data from game",
            },
        }),
        state: { loading, error },
        loadingText: "READING ISLANDS",
        errorTitle: "ISLANDS READ FAILED",
        body: content,
    });
};
