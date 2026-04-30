import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    writeVerified,
} from "../accountShared.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const BEANSTACK_PATH = "Ninja[104]";
const BEANSTACK_MAX_LEVEL = 3;

const BeanstackRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        max: BEANSTACK_MAX_LEVEL,
        integerMode: "round",
        write: (nextLevel) => writeVerified(`${BEANSTACK_PATH}[${entry.index}]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, entry.itemId)
            ),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${BEANSTACK_MAX_LEVEL}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: {
            label: "MAX",
            value: BEANSTACK_MAX_LEVEL,
            tooltip: `Set this Beanstack food to ${BEANSTACK_MAX_LEVEL}`,
        },
    });

const buildItemEntries = async (rawLevels, rawFoodInfo) => {
    const levels = toIndexedArray(rawLevels ?? []);
    const itemIds = toIndexedArray(rawFoodInfo ?? []).filter((_, index) => index % 3 === 2);
    const definitions = itemIds.length ? await readGgaEntries("ItemDefinitionsGET.h", itemIds, ["displayName"]) : {};

    return itemIds.map((itemId, index) => ({
        index,
        itemId,
        name: cleanName(definitions[itemId]?.displayName, itemId),
        level: resolveNumberInput(levels[index], { min: 0, max: BEANSTACK_MAX_LEVEL, fallback: 0 }),
    }));
};

export const BeanstackTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Beanstack" });
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawFoodInfo] = await Promise.all([gga(BEANSTACK_PATH), readCList("NinjaInfo[29]")]);
            entries.val = await buildItemEntries(rawLevels, rawFoodInfo);
            reconcileRows(entries.val.map((entry) => entry.itemId).join("|"), () =>
                entries.val.map((entry) =>
                    BeanstackRow({
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
            title: "GOLD FOOD",
            note: () => `${entries.val.length} GOLD FOODS FROM Ninja[104]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "BEANSTACK",
        description: "Edit Beanstack gold food levels from Ninja[104]. Names resolve through ItemDefinitionsGET.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING BEANSTACK",
        errorTitle: "BEANSTACK READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
