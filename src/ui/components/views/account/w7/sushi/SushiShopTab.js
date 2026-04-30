import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";

const { div, span } = van.tags;

const SUSHI_SHOP_PATH = "Sushi[2]";

const ShopUpgradeRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${SUSHI_SHOP_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name)
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

const getOrderKey = (rawOrderEntry) => {
    const values = toIndexedArray(rawOrderEntry ?? []);
    return String(values.length > 0 ? values[0] : (rawOrderEntry ?? "")).trim();
};

const buildShopEntries = (rawDefinitions, rawOrder) => {
    const orderKeys = toIndexedArray(rawOrder ?? []).map(getOrderKey);
    const orderByName = new Map(orderKeys.map((key, orderIndex) => [key, orderIndex]));
    const orderByIndex = new Map(
        orderKeys
            .map((key, orderIndex) => [Number(key), orderIndex])
            .filter(([index]) => Number.isInteger(index) && index >= 0)
    );
    const resolveSortOrder = (entry) =>
        orderByName.get(entry.rawName) ?? orderByIndex.get(entry.index) ?? Number.MAX_SAFE_INTEGER + entry.index;

    return toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[0] ?? "").trim();
            if (!rawName) return null;

            return {
                index,
                rawName,
                name: cleanName(rawName, `Sushi Upgrade ${index}`),
                maxLevel: toInt(definition[1], { min: 0 }),
            };
        })
        .filter(Boolean)
        .sort((a, b) => resolveSortOrder(a) - resolveSortOrder(b));
};

export function SushiShopTab() {
    const { loading, error, run } = useAccountLoad({ label: "Sushi Shop" });
    const upgradeEntries = van.state([]);
    const levelStates = new Map();
    const shopListNode = div({ class: "account-item-stack" });
    const reconcileShopRows = createStaticRowReconciler(shopListNode);

    const reconcileRows = () => {
        reconcileShopRows(upgradeEntries.val.map((entry) => entry.rawName).join("|"), () =>
            upgradeEntries.val.map((entry) =>
                ShopUpgradeRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawDefinitions, rawOrder] = await Promise.all([readCList("SushiUPG"), readCList("Research[32]")]);
            upgradeEntries.val = buildShopEntries(rawDefinitions, rawOrder);
            reconcileRows();

            const levels = toIndexedArray((await gga(SUSHI_SHOP_PATH)) ?? []);
            for (const entry of upgradeEntries.val) {
                getOrCreateState(levelStates, entry.index).val = Math.min(
                    entry.maxLevel,
                    toInt(levels[entry.index], { min: 0 })
                );
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SHOP UPGRADES",
            note: () => `${upgradeEntries.val.length} UPGRADES`,
            body: shopListNode,
        })
    );

    return PersistentAccountListPage({
        title: "SUSHI SHOP",
        description: "Set Sushi shop upgrade levels from Sushi[2]. Max levels come from SushiUPG.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SUSHI SHOP",
        errorTitle: "SUSHI SHOP READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
}
