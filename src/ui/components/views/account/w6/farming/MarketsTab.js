import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputedMany } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";

const { div, span } = van.tags;

const FARM_UPG_PATH = "FarmUpg";
const MARKET_SIZE = 8;

const MarketUpgradeRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${FARM_UPG_PATH}[${entry.pathIndex}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.pathIndex}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

const buildMarketEntries = ({ rawDefinitions, rawLevels, rawMaxResults, mode, offset, pathOffset }) => {
    const definitions = toIndexedArray(rawDefinitions ?? []);
    const levels = toIndexedArray(rawLevels ?? []);

    return Array.from({ length: MARKET_SIZE }, (_, index) => {
        const definition = toIndexedArray(definitions[offset + index] ?? []);
        const maxResult = rawMaxResults[index];
        if (!maxResult?.ok) {
            throw new Error(maxResult?.error || `MarketMaxLV failed for mode ${mode}, index ${index}`);
        }

        return {
            index,
            pathIndex: pathOffset + index,
            rawName: String(definition[0] ?? `Upgrade_${index}`).trim(),
            name: cleanName(definition[0], `Upgrade ${index + 1}`),
            level: toInt(levels[pathOffset + index], { min: 0 }),
            maxLevel: toInt(maxResult.value, { min: 0 }),
        };
    });
};

export const MarketsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Markets" });
    const marketEntries = van.state([]);
    const nightMarketEntries = van.state([]);
    const levelStates = new Map();
    const marketListNode = div({ class: "account-item-stack" });
    const nightMarketListNode = div({ class: "account-item-stack" });
    const reconcileMarketRows = createStaticRowReconciler(marketListNode);
    const reconcileNightMarketRows = createStaticRowReconciler(nightMarketListNode);

    const reconcileRows = () => {
        reconcileMarketRows(marketEntries.val.map((entry) => `${entry.rawName}:${entry.maxLevel}`).join("|"), () =>
            marketEntries.val.map((entry) =>
                MarketUpgradeRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.pathIndex),
                })
            )
        );
        reconcileNightMarketRows(
            nightMarketEntries.val.map((entry) => `${entry.rawName}:${entry.maxLevel}`).join("|"),
            () =>
                nightMarketEntries.val.map((entry) =>
                    MarketUpgradeRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.pathIndex),
                    })
                )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawLevels, rawDefinitions, rawMarketMaxes, rawNightMarketMaxes] = await Promise.all([
                gga(FARM_UPG_PATH),
                readCList("MarketInfo"),
                readComputedMany(
                    "farming",
                    "MarketMaxLV",
                    Array.from({ length: MARKET_SIZE }, (_, index) => [0, index])
                ),
                readComputedMany(
                    "farming",
                    "MarketMaxLV",
                    Array.from({ length: MARKET_SIZE }, (_, index) => [1, index])
                ),
            ]);

            marketEntries.val = buildMarketEntries({
                rawDefinitions,
                rawLevels,
                rawMaxResults: rawMarketMaxes,
                mode: 0,
                offset: 0,
                pathOffset: 2,
            });
            nightMarketEntries.val = buildMarketEntries({
                rawDefinitions,
                rawLevels,
                rawMaxResults: rawNightMarketMaxes,
                mode: 1,
                offset: MARKET_SIZE,
                pathOffset: 10,
            });
            reconcileRows();

            for (const entry of [...marketEntries.val, ...nightMarketEntries.val]) {
                getOrCreateState(levelStates, entry.pathIndex).val = Math.min(entry.maxLevel, entry.level);
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "MARKET UPGRADES",
            note: () => `${marketEntries.val.length} UPGRADES FROM FarmUpg[2-9]`,
            body: marketListNode,
        }),
        AccountSection({
            title: "NIGHT MARKET UPGRADES",
            note: () => `${nightMarketEntries.val.length} UPGRADES FROM FarmUpg[10-17]`,
            body: nightMarketListNode,
        })
    );

    return PersistentAccountListPage({
        title: "MARKETS",
        description: "Set Farming market and night market upgrade levels. Max levels are read from FarmingStuffs.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING FARMING MARKETS",
        errorTitle: "FARMING MARKETS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
