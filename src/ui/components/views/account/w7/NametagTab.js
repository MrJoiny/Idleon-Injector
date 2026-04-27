import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountSection } from "../components/AccountSection.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt, writeVerified } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, span } = van.tags;

const NAMETAG_COUNTS_PATH = "Spelunk[17]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";
const NAMETAG_KEY_PATTERN = /^EquipmentNametag(\d+)$/;

const buildNametagCatalog = (rawItemDefs) =>
    Object.entries(rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {})
        .map(([itemId, raw]) => {
            const def = raw?.h ?? raw;
            const match = itemId.match(NAMETAG_KEY_PATTERN);
            if (!match) return null;

            return {
                itemId,
                nametagNumber: Number(match[1]),
                name: cleanName(
                    def?.displayName || def?.DisplayName || def?.name || def?.Name || def?.desc_line1 || itemId
                ),
                defId: def?.ID ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.nametagNumber - b.nametagNumber);

const NametagRow = ({ row, amountState }) =>
    EditableNumberRow({
        valueState: amountState,
        normalize: (raw) => toInt(raw, { min: 0 }),
        write: async (nextAmount) => writeVerified(`${NAMETAG_COUNTS_PATH}[${row.nametagNumber}]`, nextAmount),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${row.nametagNumber}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, row.name),
                span({ class: "account-row__sub-label" }, row.itemId)
            ),
        ],
        renderBadge: (currentValue) => String(currentValue),
        adjustInput: (rawValue, delta, currentValue) => Math.max(0, toInt(rawValue, currentValue) + delta),
    });

export const NametagTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Nametags" });
    const amountStates = new Map();
    const catalogState = van.state([]);
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileNametagRows = createStaticRowReconciler(listNode);
    let catalogCache = [];

    const totalDelivered = van.derive(() =>
        catalogState.val.reduce(
            (total, row) => total + toInt(getOrCreateState(amountStates, row.nametagNumber).val, { min: 0 }),
            0
        )
    );

    const reconcileRows = () => {
        reconcileNametagRows(catalogCache.map((row) => row.itemId).join("|"), () =>
            catalogCache.map((row) =>
                NametagRow({
                    row,
                    amountState: getOrCreateState(amountStates, row.nametagNumber),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            catalogCache = buildNametagCatalog(await gga(ITEM_DEFS_PATH));
            catalogState.val = catalogCache;

            const counts = toIndexedArray((await gga(NAMETAG_COUNTS_PATH)) ?? []);
            for (const row of catalogCache) {
                getOrCreateState(amountStates, row.nametagNumber).val = toInt(counts[row.nametagNumber], { min: 0 });
            }

            reconcileRows();
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "NAMETAG AMOUNTS",
            note: () => `${catalogState.val.length} NAMETAGS, ${totalDelivered.val} TOTAL DELIVERED`,
            body: () =>
                catalogState.val.length === 0
                    ? div({ class: "tab-empty" }, "No EquipmentNametag item definitions were found.")
                    : listNode,
        })
    );

    return PersistentAccountListPage({
        title: "NAMETAGS",
        description: "Set delivered nametag amounts from Spelunk[17]. Each index maps directly to EquipmentNametagX.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING NAMETAGS",
        errorTitle: "NAMETAG READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
