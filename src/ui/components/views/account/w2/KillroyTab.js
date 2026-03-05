import van from "../../../../vendor/van-1.6.0.js";
import { readGga, readGgaEntries, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p, table, thead, tbody, tr, th, td, select, option } = van.tags;

const CURRENCY_FIELDS = [
    { index: 105, label: "KILLROY SKULLS" },
];

const SHOP_FIELDS = [
    { index: 106, label: "TIMER LEVEL" },
    { index: 107, label: "TALENT DROPS LEVEL" },
    { index: 108, label: "BONUS SKULLS LEVEL" },
    { index: 109, label: "RESPAWN LEVEL" },
    { index: 110, label: "5TH BONUS LEVEL", blurred: true },
    { index: 111, label: "6TH BONUS LEVEL", blurred: true },
];

const META_FIELDS = [
    { index: 467, label: "GALLERY BONUS" },
    { index: 468, label: "MASTERCLASS BONUS" },
    { index: 469, label: "W7 SKILL XP BONUS" },
    { index: 470, label: "W7 DAILY CORAL BONUS" },
    { index: 471, label: "BOOST SOMETHING BONUS", blurred: true },
];

const RECORD_FIELDS = [
    { index: 112, label: "TOTAL FINISHED RUNS" },
];

const PB_TOME_FIELDS = [
    { key: "melee", label: "HIGHEST KILLROY SCORE ON A WARRIOR", path: "CustomLists.h.Tome[27][0]", tomeIndex: 27 },
    { key: "ranged", label: "HIGHEST KILLROY SCORE ON AN ARCHER", path: "CustomLists.h.Tome[28][0]", tomeIndex: 28 },
    { key: "magic", label: "HIGHEST KILLROY SCORE ON A MAGE", path: "CustomLists.h.Tome[29][0]", tomeIndex: 29 },
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

const toNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

const Section = (title, note, rows) =>
    div(
        { class: "killroy-section" },
        div(
            { class: "killroy-section__header" },
            span({ class: "killroy-section__title" }, title),
            note ? span({ class: "killroy-section__note" }, note) : null,
        ),
        div({ class: "killroy-rows" }, ...rows),
    );

const KillroyNumRow = ({ field, valueState, writePath, getBadgeText = null, disableEdit = false }) => {
    const inputVal = van.state(String(valueState.val));
    const status = van.state(null);

    van.derive(() => { inputVal.val = String(valueState.val); });

    const normalize = (raw) => {
        const parsed = Math.round(Number(raw));
        if (!Number.isFinite(parsed)) return null;
        if (field.allowNegative) return parsed;
        return Math.max(0, parsed);
    };

    const doSet = async () => {
        const val = normalize(inputVal.val);
        if (val === null) return;
        status.val = "loading";
        try {
            await writeGga(writePath, val);
            valueState.val = val;
            inputVal.val = String(val);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "feature-row",
                "killroy-row",
                field.blurred ? "killroy-row--blur" : "",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, field.label),
        ),
        span(
            { class: "feature-row__badge" },
            () => {
                if (typeof getBadgeText === "function") return getBadgeText(valueState.val);
                return String(valueState.val);
            },
        ),
        div(
            { class: "feature-row__controls" },
            disableEdit
                ? span({ class: "killroy-row__locked" }, "LOCKED")
                : [
                    NumberInput({
                        mode: "int",
                        value: inputVal,
                        oninput: (e) => (inputVal.val = e.target.value),
                        onDecrement: () => {
                            const next = toNum(inputVal.val, toNum(valueState.val, 0)) - 1;
                            inputVal.val = String(field.allowNegative ? next : Math.max(0, next));
                        },
                        onIncrement: () => {
                            const next = toNum(inputVal.val, toNum(valueState.val, 0)) + 1;
                            inputVal.val = String(next);
                        },
                    }),
                    button(
                        {
                            class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                            disabled: () => status.val === "loading",
                            onclick: doSet,
                        },
                        () => status.val === "loading" ? "..." : "SET",
                    ),
                ],
        ),
    );
};

const KillroyAirhornRow = ({ valueState }) => {
    const status = van.state(null);

    const doToggle = async () => {
        const next = toNum(valueState.val, 0) === 0 ? 1 : 0;
        status.val = "loading";
        try {
            await writeGga(`OptionsListAccount[${AIRHORN_INDEX}]`, next);
            valueState.val = next;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "feature-row",
                "killroy-row",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, "AIRHORN RESET"),
        ),
        span(
            { class: "feature-row__badge" },
            () => toNum(valueState.val, 0) === 0 ? "OFF" : "ON",
        ),
        div(
            { class: "feature-row__controls" },
            button(
                {
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doToggle,
                },
                () => status.val === "loading" ? "..." : "TOGGLE",
            ),
        ),
    );
};

export const KillroyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const sortBy = van.state("kills-desc");
    const allowedMobs = van.state([]);
    const addMobId = van.state("");
    const addKillsInput = van.state("0");
    const addStatus = van.state(null);

    const valueStates = new Map(FIELD_INDEXES.map((idx) => [idx, van.state(0)]));
    const pbTomeStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(0)]));
    const pbLabelStates = new Map(PB_TOME_FIELDS.map((f) => [f.key, van.state(f.label)]));
    const bestByMob = van.state([]);

    const getState = (index) => valueStates.get(index);
    const getPbState = (key) => pbTomeStates.get(key);
    const getPbLabelState = (key) => pbLabelStates.get(key);

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const valueJobs = FIELD_INDEXES.map((idx) =>
                readGga(`OptionsListAccount[${idx}]`).then((v) => ({ idx, value: toNum(v, 0) }))
            );

            const pbJobs = PB_TOME_FIELDS.map((f) =>
                readGga(f.path).then((v) => ({ key: f.key, value: toNum(v, 0) }))
            );
            const pbLabelJobs = PB_TOME_FIELDS.map((f) =>
                readGga(`CustomLists.h.Tome[${f.tomeIndex}]`).then((row) => {
                    const arr = Array.isArray(row) ? row : Object.values(row ?? {});
                    const labelRaw = arr.find((x) => typeof x === "string" && x.trim().length > 0);
                    return { key: f.key, label: labelRaw };
                }).catch(() => ({ key: f.key, label: null }))
            );

            const [fieldValues, pbValues, pbLabels, rawBestByMob] = await Promise.all([
                Promise.all(valueJobs),
                Promise.all(pbJobs),
                Promise.all(pbLabelJobs),
                readGga("KRbest.h"),
            ]);

            for (const { idx, value } of fieldValues) {
                const st = getState(idx);
                if (st) st.val = value;
            }
            for (const { key, value } of pbValues) {
                const st = getPbState(key);
                if (st) st.val = value;
            }
            for (const { key, label } of pbLabels) {
                const st = getPbLabelState(key);
                if (!st) continue;
                if (typeof label === "string" && label.trim().length > 0) {
                    st.val = label.replace(/_/g, " ");
                }
            }

            const rawEntries = Object.entries(rawBestByMob ?? {})
                .map(([mobKey, kills]) => ({ mobKey, kills: toNum(kills, 0) }))
                .filter((entry) => entry.mobKey && entry.mobKey !== "__proto__");

            const mobKeys = rawEntries.map((entry) => entry.mobKey);
            const mobDefs = mobKeys.length > 0
                ? await readGgaEntries("MonsterDefinitionsGET.h", mobKeys, ["Name"])
                : {};

            bestByMob.val = rawEntries.map((entry) => {
                const rawName = mobDefs?.[entry.mobKey]?.Name;
                const mobName = typeof rawName === "string" && rawName.length > 0
                    ? rawName.replace(/_/g, " ")
                    : entry.mobKey;
                return { ...entry, mobName };
            });

            const [rawKillroyMaps69, rawKillroyMaps70, rawKillroyMaps71, rawMapName, rawMapAfk] = await Promise.all([
                readGga("CustomLists.h.RANDOlist[69]"),
                readGga("CustomLists.h.RANDOlist[70]"),
                readGga("CustomLists.h.RANDOlist[71]"),
                readGga("CustomLists.h.MapName"),
                readGga("CustomLists.h.MapAFKtarget"),
            ]);

            const toArr = (raw) => (Array.isArray(raw) ? raw : Object.values(raw ?? {}));
            const mapKeys = [...toArr(rawKillroyMaps69), ...toArr(rawKillroyMaps70), ...toArr(rawKillroyMaps71)]
                .filter((k) => typeof k === "string" && k.trim().length > 0);
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

            const allowedMobDefs = allowedMobIds.length > 0
                ? await readGgaEntries("MonsterDefinitionsGET.h", allowedMobIds, ["Name"])
                : {};
            const nextAllowedMobs = allowedMobIds.map((mobId) => {
                const rawName = allowedMobDefs?.[mobId]?.Name;
                return {
                    mobId,
                    mobName: (typeof rawName === "string" && rawName.length > 0)
                        ? rawName.replace(/_/g, " ")
                        : mobId,
                };
            });
            allowedMobs.val = nextAllowedMobs;
            if (!addMobId.val && nextAllowedMobs.length > 0) addMobId.val = nextAllowedMobs[0].mobId;
        } catch (e) {
            error.val = e?.message ?? "Failed to load Killroy data";
        } finally {
            loading.val = false;
        }
    };

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
        addStatus.val = "loading";
        try {
            await writeGga(`KRbest.h[${mobId}]`, kills);
            addStatus.val = "success";
            setTimeout(() => (addStatus.val = null), 1200);
            await load();
        } catch {
            addStatus.val = "error";
            setTimeout(() => (addStatus.val = null), 1200);
        }
    };

    load();

    return div(
        { class: "killroy-tab tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "KILLROY STATE LIBRARY"),
                p(
                    { class: "feature-header__desc" },
                    "Currencies, upgrades, meta bonuses, and records for W2 Killroy.",
                ),
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", desc: error.val });

            return div(
                { class: "killroy-scroll scrollable-panel" },

                Section(
                    "CURRENCY / AVAILABILITY",
                    "Most-used Killroy currencies and weekly reset flag",
                    [
                        ...CURRENCY_FIELDS.map((field) =>
                            KillroyNumRow({
                                field,
                                valueState: getState(field.index),
                                writePath: `OptionsListAccount[${field.index}]`,
                            })
                        ),
                        KillroyAirhornRow({ valueState: getState(AIRHORN_INDEX) }),
                    ],
                ),

                Section(
                    "SHOP UPGRADES",
                    "Classic Killroy shop level tracks",
                    SHOP_FIELDS.map((field) =>
                        KillroyNumRow({
                            field,
                            valueState: getState(field.index),
                            writePath: `OptionsListAccount[${field.index}]`,
                            disableEdit: Boolean(field.blurred),
                        })
                    ),
                ),

                Section(
                    "META BONUSES",
                    "Account-wide Killroy bonus values",
                    META_FIELDS.map((field) =>
                        KillroyNumRow({
                            field,
                            valueState: getState(field.index),
                            writePath: `OptionsListAccount[${field.index}]`,
                            disableEdit: Boolean(field.blurred),
                        })
                    ),
                ),

                div(
                    { class: "killroy-section" },
                    div(
                        { class: "killroy-section__header" },
                        span({ class: "killroy-section__title" }, "RECORDS / TOME"),
                        span({ class: "killroy-section__note" }, "KRbest.h table (sortable) and PB summaries"),
                    ),

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
                                field: { ...field, label: getPbLabelState(field.key)?.val ?? field.label },
                                valueState: getPbState(field.key),
                                writePath: field.path,
                            })
                        ),
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
                            ...SORT_OPTIONS.map((opt) => option({ value: opt.id }, opt.label)),
                        ),
                        span({ class: "killroy-best-toolbar__count" }, () => `${sortedBestRows().length} ENTRIES`),
                    ),

                    div(
                        {
                            class: () => [
                                "killroy-add-row",
                                addStatus.val === "success" ? "flash-success" : "",
                                addStatus.val === "error" ? "flash-error" : "",
                            ].filter(Boolean).join(" "),
                        },
                        span({ class: "killroy-add-row__label" }, "ADD / UPDATE ENTRY"),
                        select(
                            {
                                class: "select-base killroy-add-row__select",
                                value: addMobId,
                                onchange: (e) => (addMobId.val = e.target.value),
                            },
                            ...allowedMobs.val.map((mob) =>
                                option({ value: mob.mobId }, `${mob.mobName} (${mob.mobId})`)
                            ),
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
                                class: () => `feature-btn feature-btn--apply ${addStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                                disabled: () => addStatus.val === "loading" || !addMobId.val,
                                onclick: setBestEntry,
                            },
                            () => addStatus.val === "loading" ? "..." : "SET",
                        ),
                    ),

                    div(
                        { class: "killroy-best-table-wrap" },
                        table(
                            { class: "killroy-best-table" },
                            thead(
                                tr(
                                    th({}, "MOB"),
                                    th({}, "BEST KILLS"),
                                )
                            ),
                            () => {
                                const rows = sortedBestRows();
                                if (rows.length === 0) {
                                    return tbody(
                                        tr(
                                            td(
                                                { class: "killroy-best-table__empty", colspan: 2 },
                                                "No KRbest.h entries found.",
                                            ),
                                        ),
                                    );
                                }

                                return tbody(
                                    ...rows.map((row) =>
                                        tr(
                                            td({ class: "killroy-best-table__mob" }, row.mobName),
                                            td({ class: "killroy-best-table__kills" }, String(row.kills)),
                                        )
                                    ),
                                );
                            },
                        ),
                    ),
                ),
            );
        },
    );
};
