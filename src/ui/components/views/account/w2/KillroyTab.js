/**
 * W2 - Killroy Tab
 *
 * OptionsListAccount fields used:
 *   [105]              -> Killroy skulls currency
 *   [106..111]         -> shop upgrade levels
 *   [112]              -> total finished runs
 *   [115]              -> airhorn reset toggle (0/1)
 *   [204]              -> highest killroy score on warrior
 *   [205]              -> highest killroy score on archer
 *   [206]              -> highest killroy score on mage
 *   [227..230]         -> shop meta bonus values
 *   [467..471]         -> meta bonus values
 *
 * Tome label rows (name/label only):
 *   cList.Tome[27] -> warrior label row
 *   cList.Tome[28] -> archer label row
 *   cList.Tome[29] -> mage label row
 *
 * Best scores:
 *   KRbest.h[mobId] -> best kills for that mob
 *
 * Allowed mobs:
 *   cList.DeathNoteMobs -> arrays of mob ids; Killroy renders one row per mob id
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries, readCList } from "../../../../services/api.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { cleanName, createStaticRowReconciler, joinClasses, resolveValue, toNum, useWriteStatus, writeVerified } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, span } = van.tags;

const CURRENCY_FIELDS = [{ index: 105, label: "KILLROY SKULLS" }];

const SHOP_FIELDS = [
    { index: 106, label: "TIMER LEVEL" },
    { index: 107, label: "TALENT DROPS LEVEL" },
    { index: 108, label: "BONUS SKULLS LEVEL" },
    { index: 109, label: "RESPAWN LEVEL" },
    { index: 110, label: "DUNGEON DROPS LEVEL" },
    { index: 111, label: "PEARL DROPS LEVEL" },
];

const META_FIELDS = [
    { index: 227, label: "3RD WEEKLY FIGHT UNLOCK FLAG" },
    { index: 228, label: "ARTIFACT FIND CHANCE BONUS" },
    { index: 229, label: "CROP EVOLUTION CHANCE BONUS" },
    { index: 230, label: "JADE GAIN BONUS" },
    { index: 467, label: "GALLERY BONUS" },
    { index: 468, label: "MASTERCLASS BONUS" },
    { index: 469, label: "W7 SKILL XP BONUS" },
    { index: 470, label: "W7 DAILY CORAL BONUS" },
    { index: 471, label: "BOOST SOMETHING BONUS", blurred: true },
];

const RECORD_FIELDS = [{ index: 112, label: "TOTAL FINISHED RUNS" }];

const PB_TOME_FIELDS = [
    { key: "melee", label: "HIGHEST KILLROY SCORE ON A WARRIOR", scoreIndex: 204, tomeIndex: 27 },
    { key: "ranged", label: "HIGHEST KILLROY SCORE ON AN ARCHER", scoreIndex: 205, tomeIndex: 28 },
    { key: "magic", label: "HIGHEST KILLROY SCORE ON A MAGE", scoreIndex: 206, tomeIndex: 29 },
];

const AIRHORN_INDEX = 115;
const ALL_FIELD_DEFS = [...CURRENCY_FIELDS, ...SHOP_FIELDS, ...META_FIELDS, ...RECORD_FIELDS, { index: AIRHORN_INDEX }];
const FIELD_INDEXES = Array.from(new Set(ALL_FIELD_DEFS.map((f) => f.index)));

const KillroyNumRow = ({ field, valueState, writePath, getBadgeText = null, disableEdit = false }) => {
    const normalize = (raw) => {
        const parsed = Math.round(Number(raw));
        if (!Number.isFinite(parsed)) return null;
        if (field.allowNegative) return parsed;
        return Math.max(0, parsed);
    };
    const rowClass = () => joinClasses("killroy-row", field.blurred ? "killroy-row--blur" : "");
    const labelText = () => resolveValue(field?.label) ?? "";

    if (disableEdit) {
        return AccountRow({
            rowClass,
            info: span({ class: "account-row__name" }, labelText),
            badge: () => {
                if (typeof getBadgeText === "function") return getBadgeText(valueState.val);
                return String(valueState.val);
            },
            controls: span({ class: "killroy-row__locked" }, "LOCKED"),
        });
    }

    return EditableNumberRow({
        valueState,
        normalize,
        write: async (nextValue) =>
            writeVerified(writePath, nextValue, { message: `Write mismatch at ${writePath}: expected ${nextValue}` }),
        renderInfo: () => span({ class: "account-row__name" }, labelText),
        renderBadge: (currentValue) =>
            typeof getBadgeText === "function" ? getBadgeText(currentValue) : String(currentValue),
        adjustInput: (rawValue, delta, currentValue) => {
            const next = toNum(rawValue, toNum(currentValue, 0)) + delta;
            return field.allowNegative ? next : Math.max(0, next);
        },
        rowClass,
    });
};

const KillroyAirhornRow = ({ valueState }) => {
    const { status, run } = useWriteStatus();

    const doToggle = async () => {
        const next = toNum(valueState.val, 0) === 0 ? 1 : 0;
        await run(async () => {
            const path = `OptionsListAccount[${AIRHORN_INDEX}]`;
            await writeVerified(path, next, { message: `Airhorn toggle mismatch: expected ${next}` });
            valueState.val = next;
        });
    };

    return AccountRow({
        rowClass: "killroy-row",
        status,
        info: span({ class: "account-row__name" }, "AIRHORN RESET"),
        badge: () => (toNum(valueState.val, 0) === 0 ? "OFF" : "ON"),
        controls: ActionButton({
            label: "TOGGLE",
            status,
            onClick: doToggle,
        }),
    });
};

export const KillroyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Killroy" });
    const bestMobRowsNode = div({ class: "killroy-rows" });

    const valueStates = new Map(FIELD_INDEXES.map((idx) => [idx, van.state(0)]));
    const pbScoreStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(0)]));
    const pbLabelStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(f.label)]));
    const bestMobStates = new Map();
    const reconcileBestMobRows = createStaticRowReconciler(bestMobRowsNode);

    const getState = (index) => valueStates.get(index);
    const getPbState = (key) => pbScoreStates.get(key);
    const getPbLabelState = (key) => pbLabelStates.get(key);
    const getBestMobState = (mobId) => {
        if (!bestMobStates.has(mobId)) bestMobStates.set(mobId, van.state(0));
        return bestMobStates.get(mobId);
    };

    const load = async () =>
        run(async () => {
            const optionKeys = Array.from(
                new Set([...FIELD_INDEXES, ...PB_TOME_FIELDS.map((f) => f.scoreIndex)].map((idx) => String(idx)))
            );

            const [rawOptionValues, rawTome, rawBestByMob] = await Promise.all([
                readGgaEntries("OptionsListAccount", optionKeys),
                readCList("Tome"),
                gga("KRbest.h"),
            ]);
            const tomeRows = toIndexedArray(rawTome);
            const nextFieldValues = new Map(
                FIELD_INDEXES.map((idx) => [idx, toNum(rawOptionValues?.[String(idx)], 0)])
            );
            const nextPbScores = new Map(
                PB_TOME_FIELDS.map((f) => [f.key, toNum(rawOptionValues?.[String(f.scoreIndex)], 0)])
            );
            const nextPbLabels = new Map(
                PB_TOME_FIELDS.map((f) => {
                    const row = tomeRows[f.tomeIndex];
                    const arr = Array.isArray(row) ? row : Object.values(row ?? {});
                    const labelRaw = arr.find((x) => typeof x === "string" && x.trim().length > 0);
                    const label =
                        typeof labelRaw === "string" && labelRaw.trim().length > 0
                            ? cleanName(labelRaw)
                            : f.label;
                    return [f.key, label];
                })
            );

            const rawBestByMobMap = new Map(
                Object.entries(rawBestByMob ?? {})
                    .filter(([mobKey]) => mobKey && mobKey !== "__proto__")
                    .map(([mobKey, kills]) => [mobKey, toNum(kills, 0)])
            );

            const rawDeathNoteMobs = await readCList("DeathNoteMobs");
            const allowedMobIds = [];
            for (const mobGroup of toIndexedArray(rawDeathNoteMobs)) {
                for (const mobId of toIndexedArray(mobGroup)) {
                    if (typeof mobId !== "string" || mobId.trim().length === 0) continue;
                    if (!allowedMobIds.includes(mobId)) allowedMobIds.push(mobId);
                }
            }

            const allowedMobDefs =
                allowedMobIds.length > 0
                    ? await readGgaEntries("MonsterDefinitionsGET.h", allowedMobIds, ["Name"])
                    : {};
            const nextAllowedMobs = allowedMobIds
                .map((mobId) => {
                    const rawName = allowedMobDefs?.[mobId]?.Name;
                    return {
                        mobId,
                        mobName: typeof rawName === "string" && rawName.length > 0 ? cleanName(rawName) : mobId,
                    };
                });

            for (const idx of FIELD_INDEXES) {
                const st = getState(idx);
                if (st) st.val = nextFieldValues.get(idx) ?? 0;
            }
            for (const f of PB_TOME_FIELDS) {
                const scoreState = getPbState(f.key);
                if (scoreState) scoreState.val = nextPbScores.get(f.key) ?? 0;
                const labelState = getPbLabelState(f.key);
                if (labelState) labelState.val = nextPbLabels.get(f.key) ?? f.label;
            }

            for (const mob of nextAllowedMobs) {
                getBestMobState(mob.mobId).val = rawBestByMobMap.get(mob.mobId) ?? 0;
            }

            reconcileBestMobRows(
                nextAllowedMobs.map((mob) => `${mob.mobId}:${mob.mobName}`).join("|"),
                () => {
                    if (nextAllowedMobs.length === 0) {
                        return div({ class: "killroy-best-empty" }, "No Killroy mobs found.");
                    }

                    return nextAllowedMobs.map((mob) =>
                        KillroyNumRow({
                            field: { label: `${mob.mobName} (${mob.mobId})` },
                            valueState: getBestMobState(mob.mobId),
                            writePath: `KRbest.h[${mob.mobId}]`,
                        })
                    );
                }
            );
        });

    load();
    const scrollPane = div(
        { class: "scrollable-panel content-stack" },

        AccountSection({
            title: "CURRENCY / AVAILABILITY",
            note: "Most-used Killroy currencies and weekly reset flag",
            body: div(
                { class: "killroy-rows" },
                ...CURRENCY_FIELDS.map((field) =>
                    KillroyNumRow({
                        field,
                        valueState: getState(field.index),
                        writePath: `OptionsListAccount[${field.index}]`,
                    })
                ),
                KillroyAirhornRow({ valueState: getState(AIRHORN_INDEX) })
            ),
        }),

        AccountSection({
            title: "SHOP UPGRADES",
            note: "Classic Killroy shop level tracks",
            body: div(
                { class: "killroy-rows" },
                ...SHOP_FIELDS.map((field) =>
                    KillroyNumRow({
                        field,
                        valueState: getState(field.index),
                        writePath: `OptionsListAccount[${field.index}]`,
                        disableEdit: Boolean(field.blurred),
                    })
                )
            ),
        }),

        AccountSection({
            title: "META BONUSES",
            note: "Account-wide Killroy bonus values",
            body: div(
                { class: "killroy-rows" },
                ...META_FIELDS.map((field) =>
                    KillroyNumRow({
                        field,
                        valueState: getState(field.index),
                        writePath: `OptionsListAccount[${field.index}]`,
                        disableEdit: Boolean(field.blurred),
                    })
                )
            ),
        }),

        AccountSection({
            title: "RECORDS / TOME",
            note: "Finished runs and class-specific personal best summaries",
            body: div(
                { class: "killroy-rows" },
                ...RECORD_FIELDS.map((field) =>
                    KillroyNumRow({
                        field,
                        valueState: getState(field.index),
                        writePath: `OptionsListAccount[${field.index}]`,
                    })
                ),
                ...PB_TOME_FIELDS.map((field) =>
                    KillroyNumRow({
                        field: { ...field, label: getPbLabelState(field.key) ?? field.label },
                        valueState: getPbState(field.key),
                        writePath: `OptionsListAccount[${field.scoreIndex}]`,
                    })
                )
            ),
        }),

        AccountSection({
            title: "BEST KILLS BY MOB",
            note: "Editable KRbest.h entries for all allowed Killroy mobs",
            body: bestMobRowsNode,
        })
    );
    return AccountPageShell({
        header: AccountTabHeader({
            title: "KILLROY STATE LIBRARY",
            description: "Currencies, upgrades, meta bonuses, and records for W2 Killroy.",
            actions: RefreshButton({ onRefresh: load }),
        }),
        persistentState: { loading, error },
        body: scrollPane,
    });
};


