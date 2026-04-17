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
 *   [467..471]         -> meta bonus values
 *
 * Tome label rows (name/label only):
 *   cList.Tome[27] -> warrior label row
 *   cList.Tome[28] -> archer label row
 *   cList.Tome[29] -> mage label row
 *
 * Best scores table:
 *   KRbest.h[mobId] -> best kills for that mob
 *
 * Allowed mobs for ADD/UPDATE:
 *   cList.RANDOlist[69..71] -> Killroy map keys
 *   cList.MapName           -> map key lookup
 *   cList.MapAFKtarget      -> mob id per map index
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { FeatureRow } from "../components/FeatureRow.js";
import { FeatureSection } from "../components/FeatureSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runPersistentAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { RefreshErrorBanner, toNum, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span, table, thead, tbody, tr, th, td, select, option } = van.tags;

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

const SORT_OPTIONS = [
    { id: "kills-desc", label: "Best Kills (High to Low)" },
    { id: "kills-asc", label: "Best Kills (Low to High)" },
    { id: "name-asc", label: "Mob Name (A to Z)" },
    { id: "name-desc", label: "Mob Name (Z to A)" },
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

    if (disableEdit) {
        return FeatureRow({
            rowClass: () =>
                [
                    "killroy-row",
                    field.blurred ? "killroy-row--blur" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
            info: span({ class: "feature-row__name" }, () => {
                const label = field?.label;
                if (label && typeof label === "object" && "val" in label) return label.val;
                return label ?? "";
            }),
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
        write: async (nextValue) => {
            const ok = await gga(writePath, nextValue);
            if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${nextValue}`);
            return nextValue;
        },
        renderInfo: () =>
            span({ class: "feature-row__name" }, () => {
                const label = field?.label;
                if (label && typeof label === "object" && "val" in label) return label.val;
                return label ?? "";
            }),
        renderBadge: (currentValue) =>
            typeof getBadgeText === "function" ? getBadgeText(currentValue) : String(currentValue),
        adjustInput: (rawValue, delta, currentValue) => {
            const next = toNum(rawValue, toNum(currentValue, 0)) + delta;
            return field.allowNegative ? next : Math.max(0, next);
        },
        rowClass: () =>
            ["killroy-row", field.blurred ? "killroy-row--blur" : ""]
                .filter(Boolean)
                .join(" "),
    });
};

const KillroyAirhornRow = ({ valueState }) => {
    const { status, run } = useWriteStatus();

    const doToggle = async () => {
        const next = toNum(valueState.val, 0) === 0 ? 1 : 0;
        await run(async () => {
            const path = `OptionsListAccount[${AIRHORN_INDEX}]`;
            const ok = await gga(path, next);
            if (!ok) throw new Error(`Airhorn toggle mismatch: expected ${next}`);
            valueState.val = next;
        });
    };

    return FeatureRow({
        rowClass: "killroy-row",
        status,
        info: span({ class: "feature-row__name" }, "AIRHORN RESET"),
        badge: () => (toNum(valueState.val, 0) === 0 ? "OFF" : "ON"),
        controls: button(
            {
                class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                disabled: () => status.val === "loading",
                onclick: doToggle,
            },
            () => (status.val === "loading" ? "..." : "TOGGLE")
        ),
    });
};

export const KillroyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();
    const sortBy = van.state("kills-desc");
    const allowedMobs = van.state([]);
    const addMobId = van.state("");
    const addKillsInput = van.state("0");
    const { status: addStatus, run: runAddEntry } = useWriteStatus();

    const valueStates = new Map(FIELD_INDEXES.map((idx) => [idx, van.state(0)]));
    const pbScoreStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(0)]));
    const pbLabelStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(f.label)]));
    const bestByMob = van.state([]);

    const getState = (index) => valueStates.get(index);
    const getPbState = (key) => pbScoreStates.get(key);
    const getPbLabelState = (key) => pbLabelStates.get(key);

    const load = async () =>
        runPersistentAccountLoad(
            {
                loading,
                error,
                refreshError,
                initialized,
                markReady,
                label: "Killroy",
                fallbackMessage: "Failed to load Killroy data",
            },
            async () => {
            const optionKeys = Array.from(
                new Set([...FIELD_INDEXES, ...PB_TOME_FIELDS.map((f) => f.scoreIndex)].map((idx) => String(idx)))
            );
            const pbLabelJobs = PB_TOME_FIELDS.map((f) =>
                readCList(`Tome[${f.tomeIndex}]`)
                    .then((row) => {
                        const arr = Array.isArray(row) ? row : Object.values(row ?? {});
                        const labelRaw = arr.find((x) => typeof x === "string" && x.trim().length > 0);
                        return { key: f.key, label: labelRaw };
                    })
            );

            const [rawOptionValues, pbLabels, rawBestByMob] = await Promise.all([
                readGgaEntries("OptionsListAccount", optionKeys),
                Promise.all(pbLabelJobs),
                gga("KRbest.h"),
            ]);
            const nextFieldValues = new Map(
                FIELD_INDEXES.map((idx) => [idx, toNum(rawOptionValues?.[String(idx)], 0)])
            );
            const nextPbScores = new Map(
                PB_TOME_FIELDS.map((f) => [f.key, toNum(rawOptionValues?.[String(f.scoreIndex)], 0)])
            );
            const nextPbLabels = new Map(
                PB_TOME_FIELDS.map((f) => {
                    const found = pbLabels.find((entry) => entry.key === f.key);
                    const label =
                        typeof found?.label === "string" && found.label.trim().length > 0
                            ? found.label.replace(/_/g, " ")
                            : f.label;
                    return [f.key, label];
                })
            );

            const rawEntries = Object.entries(rawBestByMob ?? {})
                .map(([mobKey, kills]) => ({ mobKey, kills: toNum(kills, 0) }))
                .filter((entry) => entry.mobKey && entry.mobKey !== "__proto__");

            const mobKeys = rawEntries.map((entry) => entry.mobKey);
            const mobDefs =
                mobKeys.length > 0 ? await readGgaEntries("MonsterDefinitionsGET.h", mobKeys, ["Name"]) : {};

            const nextBestByMob = rawEntries.map((entry) => {
                const rawName = mobDefs?.[entry.mobKey]?.Name;
                const mobName =
                    typeof rawName === "string" && rawName.length > 0 ? rawName.replace(/_/g, " ") : entry.mobKey;
                return { ...entry, mobName };
            });

            const [rawKillroyMaps69, rawKillroyMaps70, rawKillroyMaps71, rawMapName, rawMapAfk] = await Promise.all([
                readCList("RANDOlist[69]"),
                readCList("RANDOlist[70]"),
                readCList("RANDOlist[71]"),
                readCList("MapName"),
                readCList("MapAFKtarget"),
            ]);

            const toArr = (raw) => (Array.isArray(raw) ? raw : Object.values(raw ?? {}));
            const mapKeys = [...toArr(rawKillroyMaps69), ...toArr(rawKillroyMaps70), ...toArr(rawKillroyMaps71)].filter(
                (k) => typeof k === "string" && k.trim().length > 0
            );
            const mapNames = toArr(rawMapName);
            const mapAfkTargets = toArr(rawMapAfk);

            const allowedMobIds = [];
            for (const mapKey of mapKeys) {
                const mapIndex = mapNames.indexOf(mapKey);
                if (mapIndex < 0) continue;
                const mobId = mapAfkTargets[mapIndex];
                if (typeof mobId !== "string" || mobId.trim().length === 0) continue;
                if (!allowedMobIds.includes(mobId)) allowedMobIds.push(mobId);
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
                        mobName: typeof rawName === "string" && rawName.length > 0 ? rawName.replace(/_/g, " ") : mobId,
                    };
                })
                .sort((a, b) => a.mobName.localeCompare(b.mobName) || a.mobId.localeCompare(b.mobId));

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
            bestByMob.val = nextBestByMob;
            allowedMobs.val = nextAllowedMobs;
            if (nextAllowedMobs.length === 0) {
                addMobId.val = "";
            } else if (!nextAllowedMobs.some((mob) => mob.mobId === addMobId.val)) {
                addMobId.val = nextAllowedMobs[0].mobId;
            }
        }
        );

    const sortedBestRows = () => {
        const rows = [...(bestByMob.val ?? [])];
        switch (sortBy.val) {
            case "kills-asc":
                rows.sort((a, b) => a.kills - b.kills || a.mobKey.localeCompare(b.mobKey));
                break;
            case "name-asc":
                rows.sort((a, b) => a.mobName.localeCompare(b.mobName));
                break;
            case "name-desc":
                rows.sort((a, b) => b.mobName.localeCompare(a.mobName));
                break;
            case "kills-desc":
            default:
                rows.sort((a, b) => b.kills - a.kills || a.mobKey.localeCompare(b.mobKey));
                break;
        }
        return rows;
    };

    const setBestEntry = async () => {
        const mobId = addMobId.val;
        const kills = Math.max(0, Math.round(Number(addKillsInput.val)));
        if (!mobId || !Number.isFinite(kills)) return;
        await runAddEntry(async () => {
            const path = `KRbest.h[${mobId}]`;
            const ok = await gga(path, kills);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${kills}`);
            const mobLabel = allowedMobs.val.find((m) => m.mobId === mobId)?.mobName ?? mobId;
            const nextRows = [...(bestByMob.val ?? [])];
            const existingIndex = nextRows.findIndex((row) => row.mobKey === mobId);
            if (existingIndex >= 0) {
                nextRows[existingIndex] = { ...nextRows[existingIndex], kills };
            } else {
                nextRows.push({ mobKey: mobId, mobName: mobLabel, kills });
            }
            bestByMob.val = nextRows;
        });
    };

    load();
    const scrollPane = div(
        { class: () => paneClass("killroy-scroll scrollable-panel") },

        FeatureSection({
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

        FeatureSection({
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

        FeatureSection({
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

        FeatureSection({
            title: "RECORDS / TOME",
            note: "KRbest.h table (sortable) and PB summaries",
            body: [
                div(
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
                div(
                    { class: "killroy-best-toolbar" },
                    span({ class: "killroy-best-toolbar__label" }, "SORT"),
                    select(
                        {
                            class: "select-base killroy-best-toolbar__select",
                            value: sortBy,
                            onchange: (e) => (sortBy.val = e.target.value),
                        },
                        ...SORT_OPTIONS.map((opt) => option({ value: opt.id }, opt.label))
                    ),
                    span({ class: "killroy-best-toolbar__count" }, () => `${sortedBestRows().length} ENTRIES`)
                ),
                div(
                    {
                        class: () =>
                            [
                                "killroy-add-row",
                                addStatus.val === "success" ? "feature-row--success" : "",
                                addStatus.val === "error" ? "feature-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                    },
                    span({ class: "killroy-add-row__label" }, "ADD / UPDATE ENTRY"),
                    () =>
                        select(
                            {
                                class: "select-base killroy-add-row__select",
                                value: addMobId,
                                onchange: (e) => (addMobId.val = e.target.value),
                            },
                            ...((allowedMobs.val ?? []).length === 0
                                ? [option({ value: "" }, "No Killroy mobs found")]
                                : (allowedMobs.val ?? []).map((mob) =>
                                      option({ value: mob.mobId }, `${mob.mobName || mob.mobId} (${mob.mobId})`)
                                  ))
                        ),
                    NumberInput({
                        mode: "int",
                        value: addKillsInput,
                        oninput: (e) => (addKillsInput.val = e.target.value),
                        onDecrement: () => (addKillsInput.val = String(Math.max(0, toNum(addKillsInput.val, 0) - 1))),
                        onIncrement: () => (addKillsInput.val = String(toNum(addKillsInput.val, 0) + 1)),
                    }),
                    button(
                        {
                            class: () =>
                                `feature-btn feature-btn--apply ${addStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                            disabled: () => addStatus.val === "loading" || !addMobId.val,
                            onclick: setBestEntry,
                        },
                        () => (addStatus.val === "loading" ? "..." : "SET")
                    )
                ),
                div(
                    { class: "killroy-best-table-wrap" },
                    table({ class: "killroy-best-table" }, thead(tr(th({}, "MOB"), th({}, "BEST KILLS"))), () => {
                        const rows = sortedBestRows();
                        if (rows.length === 0) {
                            return tbody(
                                tr(td({ class: "killroy-best-table__empty", colspan: 2 }, "No KRbest.h entries found."))
                            );
                        }

                        return tbody(
                            ...rows.map((row) =>
                                tr(
                                    td({ class: "killroy-best-table__mob" }, row.mobName),
                                    td({ class: "killroy-best-table__kills" }, String(row.kills))
                                )
                            )
                        );
                    })
                ),
            ],
        })
    );
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "KILLROY STATE LIBRARY",
            description: "Currencies, upgrades, meta bonuses, and records for W2 Killroy.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        refreshError: renderRefreshErrorBanner,
        initialState: [
            () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
            () =>
                !loading.val && error.val && !initialized.val
                    ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                    : null,
        ],
        body: scrollPane,
    });
};
