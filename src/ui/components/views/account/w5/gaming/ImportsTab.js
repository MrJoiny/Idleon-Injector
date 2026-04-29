import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const IMPORT_START_INDEX = 25;

const ImportRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextLevel) => writeVerified(`GamingSprout[${entry.pathIndex}][0]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.pathIndex}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildImportEntries = (rawSprouts, rawNames) =>
    toIndexedArray(rawNames ?? []).map((rawName, index) => {
        const pathIndex = IMPORT_START_INDEX + index;
        const sprout = toIndexedArray(rawSprouts?.[pathIndex] ?? []);
        return {
            index,
            pathIndex,
            rawName: String(rawName ?? `Import_${index}`).trim(),
            name: cleanName(rawName, `Import ${index + 1}`),
            level: toInt(sprout[0], { min: 0 }),
        };
    });

export const ImportsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming Imports" });
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawSprouts, rawNames] = await Promise.all([gga("GamingSprout"), readCList("RandoListo2[1]")]);
            entries.val = buildImportEntries(rawSprouts, rawNames);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    ImportRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.pathIndex),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.pathIndex).val = entry.level;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "IMPORTS",
            note: () => `${entries.val.length} IMPORTS FROM GamingSprout[25+]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "IMPORTS",
        description: "Edit Gaming import levels from GamingSprout[25+] using RandoListo2 names.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING GAMING IMPORTS",
        errorTitle: "GAMING IMPORTS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
