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

const SNEAKING_UPGRADES_PATH = "Ninja[103]";

const UpgradeRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextLevel) => writeVerified(`${SNEAKING_UPGRADES_PATH}[${entry.index}]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildUpgradeEntries = (rawDefinitions, rawLevels) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[4] ?? "").trim();
            if (!rawName || rawName === "Name") return null;

            return {
                index,
                rawName,
                name: cleanName(rawName, `Upgrade ${index + 1}`),
                level: toInt(levels[index], { min: 0 }),
            };
        })
        .filter(Boolean);
};

export const UpgradesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sneaking Upgrades" });
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawDefinitions] = await Promise.all([gga(SNEAKING_UPGRADES_PATH), readCList("NinjaUpg")]);
            entries.val = buildUpgradeEntries(rawDefinitions, rawLevels);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    UpgradeRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = entry.level;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SNEAKING UPGRADES",
            note: () => `${entries.val.length} UPGRADES FROM Ninja[103]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "UPGRADES",
        description: "Edit Sneaking upgrade levels from Ninja[103]. Names come from NinjaUpg.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SNEAKING UPGRADES",
        errorTitle: "SNEAKING UPGRADES READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
