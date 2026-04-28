import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const FARM_UPG_PATH = "FarmUpg";
const EXOTIC_OFFSET = 20;

const ExoticUpgradeRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextLevel) => writeVerified(`${FARM_UPG_PATH}[${entry.pathIndex}]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.pathIndex}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildExoticEntries = (rawDefinitions, rawLevels) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawDefinitions ?? []).map((rawDefinition, index) => {
        const definition = toIndexedArray(rawDefinition ?? []);
        const pathIndex = EXOTIC_OFFSET + index;
        return {
            index,
            pathIndex,
            rawName: String(definition[0] ?? `NAME_MAGNI_${index}`).trim(),
            name: cleanName(definition[0], `NAME MAGNI ${index + 1}`),
            level: toInt(levels[pathIndex], { min: 0 }),
        };
    });
};

export const ExoticTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Exotic Market" });
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawDefinitions] = await Promise.all([gga(FARM_UPG_PATH), readCList("MarketExoticInfo")]);
            entries.val = buildExoticEntries(rawDefinitions, rawLevels);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    ExoticUpgradeRow({
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
            title: "EXOTIC MARKET UPGRADES",
            note: () => `${entries.val.length} UPGRADES FROM FarmUpg[20+]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "EXOTIC",
        description: "Set Exotic Market upgrade levels from FarmUpg[20+] with names from MarketExoticInfo.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING EXOTIC MARKET",
        errorTitle: "EXOTIC MARKET READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
