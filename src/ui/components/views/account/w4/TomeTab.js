import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountRow } from "../components/AccountRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const TOME_VALUES_PATH = "DNSM.h.TomeQTY";
const directOption = (index) => ({ path: `OptionsListAccount[${index}]` });
const reciprocalOption = (index) => ({
    path: `OptionsListAccount[${index}]`,
    source: `1 / OptionsListAccount[${index}]`,
    toWrite: (value) => (value === 0 ? null : 1 / value),
});
const thousandMinusOption = (index) => ({
    path: `OptionsListAccount[${index}]`,
    source: `1000 - OptionsListAccount[${index}]`,
    toWrite: (value) => 1000 - value,
});
const powerOfTwoOption = (index) => ({
    path: `OptionsListAccount[${index}]`,
    source: `2 ^ OptionsListAccount[${index}]`,
    toWrite: (value) => (value <= 0 ? null : Math.log2(value)),
});
const roundedClampedPlusOneOption = (index) => ({
    path: `OptionsListAccount[${index}]`,
    source: `Round(Min(12, OptionsListAccount[${index}]) + 1)`,
    normalize: (value) => Math.round(Math.max(1, Math.min(13, value))),
    toWrite: (value) => Math.max(0, Math.min(12, Math.round(value) - 1)),
});
const roundedOption = (index) => ({
    path: `OptionsListAccount[${index}]`,
    source: `Round(OptionsListAccount[${index}])`,
    normalize: (value) => Math.round(value),
    toWrite: (value) => Math.round(value),
});
const divinityMinusTenOption = () => ({
    path: "Divinity[25]",
    source: "Max(0, Divinity[25] - 10)",
    normalize: (value) => Math.max(0, value),
    toWrite: (value) => value + 10,
});

const TOME_EDITORS = new Map(
    [
        [8, directOption(198)],
        [9, directOption(208)],
        [12, directOption(201)],
        [14, directOption(172)],
        [13, { path: "Tasks[0][0][2]" }],
        [16, reciprocalOption(202)],
        [18, directOption(200)],
        [20, directOption(203)],
        [25, directOption(199)],
        [27, directOption(204)],
        [28, directOption(205)],
        [29, directOption(206)],
        [30, thousandMinusOption(207)],
        [31, directOption(211)],
        [32, directOption(212)],
        [33, directOption(213)],
        [34, directOption(214)],
        [35, directOption(215)],
        [36, directOption(209)],
        [44, directOption(224)],
        [45, { path: "Rift[0]" }],
        [47, thousandMinusOption(220)],
        [54, directOption(217)],
        [58, divinityMinusTenOption()],
        [59, { path: "GamingSprout[28][1]" }],
        [61, { path: "Sailing[1][0]" }],
        [63, directOption(210)],
        [64, { path: "Gaming[8]" }],
        [66, { path: "Gaming[0]" }],
        [56, thousandMinusOption(218)],
        [67, powerOfTwoOption(219)],
        [78, directOption(221)],
        [79, directOption(222)],
        [85, directOption(262)],
        [86, directOption(279)],
        [90, directOption(356)],
        [94, roundedClampedPlusOneOption(353)],
        [95, roundedOption(369)],
        [100, directOption(445)],
        [101, directOption(446)],
        [106, directOption(443)],
        [108, { path: "Bubba[1][8]" }],
        [110, { path: "Research[7][4]" }],
        [113, directOption(498)],
        [117, directOption(594)],
        [87, { path: "Holes[11][73]" }],
        [88, { path: "Holes[11][74]" }],
        [89, { path: "Holes[11][75]" }],
        [91, { path: "Holes[11][8]" }],
    ].map(([index, editor]) => [index, { ...editor, source: editor.source ?? editor.path }])
);

const orderedTomeIndexes = (rawTomeRows, rawOrder) => {
    const namedIndexes = toIndexedArray(rawTomeRows ?? [])
        .map((rawRow, index) => {
            const row = toIndexedArray(rawRow ?? []);
            const rawName = String(row[0] ?? "").trim();
            return rawName ? index : null;
        })
        .filter((index) => index !== null);
    const namedIndexSet = new Set(namedIndexes);
    const orderedIndexes = toIndexedArray(rawOrder ?? [])
        .map((rawIndex) => Number(rawIndex))
        .filter((index) => Number.isInteger(index) && namedIndexSet.has(index));
    const seen = new Set(orderedIndexes);

    return [...orderedIndexes, ...namedIndexes.filter((index) => !seen.has(index))];
};

const buildTomeEntries = (rawValues, rawTomeRows, rawOrder) => {
    const values = toIndexedArray(rawValues ?? []);
    const tomeRows = toIndexedArray(rawTomeRows ?? []);

    return orderedTomeIndexes(tomeRows, rawOrder).map((index) => {
        const row = toIndexedArray(tomeRows[index] ?? []);
        const rawName = String(row[0] ?? "").trim();

        return {
            index,
            key: `tome:${index}:${rawName}`,
            name: cleanName(rawName.replace(/膛/g, ""), `Tome ${index + 1}`),
            value: values[index] ?? 0,
            editor: TOME_EDITORS.get(index) ?? null,
        };
    });
};

const normalizeEditableValue = (rawValue, editor) => {
    const normalized = resolveNumberInput(rawValue, {
        formatted: true,
        float: true,
        min: -Infinity,
        fallback: null,
    });
    if (normalized === null || normalized === undefined || Number.isNaN(normalized)) return null;
    return typeof editor.normalize === "function" ? editor.normalize(normalized) : normalized;
};

const writeEditableValue = async (editor, nextValue) => {
    const writeValue = typeof editor.toWrite === "function" ? editor.toWrite(nextValue) : nextValue;
    if (writeValue === null || writeValue === undefined || Number.isNaN(writeValue)) {
        throw new Error(`Invalid Tome write value for ${editor.path}`);
    }
    await writeVerified(editor.path, writeValue);
    return nextValue;
};

const TomeEditableRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => normalizeEditableValue(rawValue, entry.editor),
        write: (nextValue) => writeEditableValue(entry.editor, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name)
            ),
        ],
        renderBadge: (currentValue) => largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) => adjustFormattedIntInput(rawValue, delta, currentValue ?? 0),
        controlsClass: "account-row__controls--xl",
        inputMode: "float",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

const TomeRow = ({ entry }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name)
            ),
        ],
        badge: () => largeFormatter(entry.value ?? 0),
    });

export const TomeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Tome" });
    const entries = van.state([]);
    const valueStates = new Map();
    const tomeRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileTomeRows = createStaticRowReconciler(tomeRows);

    const reconcileRows = () =>
        reconcileTomeRows(
            entries.val.map((entry) => (entry.editor ? entry.key : `${entry.key}:${entry.value}`)).join("|"),
            () =>
                entries.val.map((entry) =>
                    entry.editor
                        ? TomeEditableRow({ entry, valueState: getOrCreateState(valueStates, entry.index) })
                        : TomeRow({ entry })
                )
        );

    const load = async () =>
        run(async () => {
            const [rawValues, rawTomeRows, rawOrder] = await Promise.all([
                gga(TOME_VALUES_PATH),
                readCList("Tome"),
                readCList("NinjaInfo[32]"),
            ]);

            entries.val = buildTomeEntries(rawValues, rawTomeRows, rawOrder);
            reconcileRows();

            for (const entry of entries.val) {
                if (entry.editor) getOrCreateState(valueStates, entry.index).val = entry.value;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "TOME",
            note: () =>
                `${entries.val.filter((entry) => entry.editor).length} EDITABLE / ${entries.val.length} VALUES FROM ${TOME_VALUES_PATH}`,
            body: tomeRows,
        })
    );

    return PersistentAccountListPage({
        title: "TOME",
        description: "View W4 Tome values from DNSM. Editable rows write to their real backing paths.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING TOME",
        errorTitle: "TOME READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
