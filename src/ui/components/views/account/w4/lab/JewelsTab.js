import van from "../../../../../vendor/van-1.6.0.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountToggleRow } from "../../components/AccountToggleRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createIndexedStateGetter,
    createStaticRowReconciler,
    readLevelDefinitions,
    toInt,
    writeVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const JEWEL_UNLOCKS_PATH = "Lab[14]";

const readJewelEntries = () =>
    readLevelDefinitions({
        levelsPath: JEWEL_UNLOCKS_PATH,
        definitionsPath: "JewelDesc",
        mapEntry: ({ index, definition, rawLevel }) => {
            const rawName = String(definition[11] ?? "").trim();
            if (!rawName) return null;

            return {
                index,
                key: `jewel:${index}:${rawName}`,
                name: cleanName(rawName, `Jewel ${index + 1}`),
                path: `${JEWEL_UNLOCKS_PATH}[${index}]`,
                value: Math.min(1, toInt(rawLevel, { min: 0 })),
            };
        },
    });

const JewelRow = ({ entry, unlockedState }) => {
    const writeToggle = async (enabled) => {
        const nextValue = enabled ? 1 : 0;
        await writeVerified(entry.path, nextValue);
        unlockedState.val = nextValue;
    };

    return AccountToggleRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => (toInt(unlockedState.val, { min: 0 }) ? "UNLOCKED" : "LOCKED"),
        checked: () => Boolean(toInt(unlockedState.val, { min: 0 })),
        title: "Toggle jewel unlock",
        write: writeToggle,
    });
};

export const JewelsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Lab jewels" });
    const jewelEntries = van.state([]);
    const getJewelState = createIndexedStateGetter(0);
    const jewelRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileJewelRows = createStaticRowReconciler(jewelRows);

    const reconcileRows = () =>
        reconcileJewelRows(
            jewelEntries.val.map((entry) => entry.key).join("|"),
            () =>
                jewelEntries.val.map((entry) =>
                    JewelRow({
                        entry,
                        unlockedState: getJewelState(entry.index),
                    })
                )
        );

    const load = async () =>
        run(async () => {
            jewelEntries.val = await readJewelEntries();
            reconcileRows();

            for (const entry of jewelEntries.val) getJewelState(entry.index).val = entry.value;
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "JEWELS",
            note: () => `${jewelEntries.val.length} JEWELS FROM Lab[14]`,
            body: jewelRows,
        })
    );

    return PersistentAccountListPage({
        title: "LAB JEWELS",
        description: "Edit W4 Lab jewel unlock flags.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING LAB JEWELS",
        errorTitle: "LAB JEWEL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
