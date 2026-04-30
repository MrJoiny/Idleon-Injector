import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const IMPORT_START_INDEX = 25;

const ImportRow = ({ entry, levelState }) =>
    SimpleNumberRow({
        entry,
        valueState: levelState,
    });

const buildImportEntries = (rawSprouts, rawNames) =>
    toIndexedArray(rawNames ?? []).map((rawName, index) => {
        const pathIndex = IMPORT_START_INDEX + index;
        const sprout = toIndexedArray(rawSprouts?.[pathIndex] ?? []);
        return {
            index: pathIndex,
            pathIndex,
            path: `GamingSprout[${pathIndex}][0]`,
            rawName: String(rawName ?? `Import_${index}`).trim(),
            name: cleanName(rawName, `Import ${index + 1}`),
            level: toInt(sprout[0], { min: 0 }),
            badge: (currentValue) => `LV ${currentValue ?? 0}`,
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
