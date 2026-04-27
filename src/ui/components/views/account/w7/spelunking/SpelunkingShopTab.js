import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { AccountSection } from "../../components/AccountSection.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { cleanName, createStaticRowReconciler, toInt } from "../../accountShared.js";

const { div, span } = van.tags;

const SHOP_LEVELS_PATH = "Spelunk[5]";

const ShopUpgradeRow = ({ entry }) =>
    ClampedLevelRow({
        valueState: entry.levelState,
        writePath: `${SHOP_LEVELS_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index + 1}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name)
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

const buildShopDefinitions = (rawDefinitions) =>
    toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[0] ?? "").trim();
            if (!rawName || rawName === "_") return null;

            return {
                index,
                rawName,
                name: cleanName(rawName, `Upgrade ${index + 1}`),
                maxLevel: toInt(definition[3], { min: 0 }),
            };
        })
        .filter(Boolean);

export function SpelunkingShopTab() {
    const { loading, error, run } = useAccountLoad({ label: "Spelunking Shop" });
    const upgradeEntries = van.state([]);
    const shopListNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileShopRows = createStaticRowReconciler(shopListNode);
    let definitionsCache = [];

    const reconcileRows = () => {
        reconcileShopRows(upgradeEntries.val.map((entry) => entry.rawName).join("|"), () =>
            upgradeEntries.val.map((entry) => ShopUpgradeRow({ entry }))
        );
    };

    const load = async () =>
        run(async () => {
            definitionsCache = buildShopDefinitions(await readCList("SpelunkUpg"));

            const rawLevels = toIndexedArray((await gga(SHOP_LEVELS_PATH)) ?? []);
            const existing = upgradeEntries.val;
            const sameShape =
                existing.length === definitionsCache.length &&
                existing.every(
                    (entry, i) =>
                        entry.index === definitionsCache[i].index && entry.rawName === definitionsCache[i].rawName
                );

            if (!sameShape) {
                upgradeEntries.val = definitionsCache.map((definition) => ({
                    ...definition,
                    levelState: van.state(
                        Math.min(definition.maxLevel, toInt(rawLevels[definition.index], { min: 0 }))
                    ),
                }));
                reconcileRows();
                return;
            }

            for (const entry of existing) {
                entry.levelState.val = Math.min(entry.maxLevel, toInt(rawLevels[entry.index], { min: 0 }));
            }
        });

    load();

    const cappedCount = van.derive(
        () => upgradeEntries.val.filter((entry) => toInt(entry.levelState.val, { min: 0 }) >= entry.maxLevel).length
    );

    const totalLevels = van.derive(() =>
        upgradeEntries.val.reduce((total, entry) => total + toInt(entry.levelState.val, { min: 0 }), 0)
    );

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SHOP UPGRADES",
            note: () =>
                `${upgradeEntries.val.length} UPGRADES, ${cappedCount.val} CAPPED, ${totalLevels.val} TOTAL LEVELS`,
            body: shopListNode,
        })
    );

    return PersistentAccountListPage({
        title: "SPELUNKING SHOP",
        description: "Set W7 Spelunking shop upgrade levels from Spelunk[5]. Max levels come from SpelunkUpg.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SPELUNKING SHOP",
        errorTitle: "SPELUNKING SHOP READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
}
