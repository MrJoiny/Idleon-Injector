import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    toInt,
} from "../../accountShared.js";

const { div } = van.tags;

const STICKER_PATH = "Research[9]";

const StickerRow = ({ entry, amountState }) =>
    SimpleNumberRow({
        entry,
        valueState: amountState,
    });

const buildStickerEntries = (rawNames, rawAmounts) => {
    const names = toIndexedArray(rawNames ?? []);
    const amounts = toIndexedArray(rawAmounts ?? []);
    return names
        .map((rawName, index) => {
            const name = String(rawName ?? `Nonexistent_Sticker_${index}`).trim();
            if (name === "Nonexistent_Sticker") return null;

            return {
                index,
                path: `${STICKER_PATH}[${index}]`,
                rawName: name,
                name: cleanName(name, `Sticker ${index + 1}`),
                amount: toInt(amounts[index], { min: 0 }),
                badge: (currentValue) => `AMT ${currentValue ?? 0}`,
                formatted: false,
            };
        })
        .filter(Boolean);
};

export const StickerTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Stickers" });
    const entries = van.state([]);
    const amountStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawAmounts, rawNames] = await Promise.all([gga(STICKER_PATH), readCList("Research[23]")]);
            entries.val = buildStickerEntries(rawNames, rawAmounts);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    StickerRow({
                        entry,
                        amountState: getOrCreateState(amountStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(amountStates, entry.index).val = entry.amount;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "STICKERS",
            note: () => `${entries.val.length} STICKER SLOTS FROM Research[9]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "STICKER",
        description: "Edit Farming sticker amounts from Research[9]. Names come from Research[23].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING FARMING STICKERS",
        errorTitle: "FARMING STICKERS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
