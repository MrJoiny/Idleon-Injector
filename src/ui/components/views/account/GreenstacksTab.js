import van from "../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../services/api.js";
import { toIndexedArray } from "../../../utils/index.js";
import { SearchBar } from "../../SearchBar.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { cleanName, largeFormatter } from "./accountShared.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { AccountRow } from "./components/AccountRow.js";
import { AccountSection } from "./components/AccountSection.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const GREENSTACK_AMOUNT = 10_000_000;
const IGNORED_STORAGE_IDS = new Set(["Blank", "LockedInvSpace"]);

const resolveItemName = (itemId, definitions) => {
    const definition = definitions[itemId] ?? {};
    return cleanName(definition.displayName ?? definition.DisplayName ?? definition.Name ?? definition.name, itemId);
};

const buildPermanentEntries = (rawGreenstacks, definitions) =>
    toIndexedArray(rawGreenstacks ?? [])
        .map((rawItemId, index) => ({ itemId: String(rawItemId ?? "").trim(), index }))
        .filter((entry) => entry.itemId)
        .map((entry) => ({ ...entry, name: resolveItemName(entry.itemId, definitions) }));

const buildReadyEntries = (rawOrder, rawQuantities, permanentIds, definitions) => {
    const order = toIndexedArray(rawOrder ?? []);
    const quantities = toIndexedArray(rawQuantities ?? []);
    const seen = new Set();

    return order
        .map((rawItemId, index) => ({
            itemId: String(rawItemId ?? "").trim(),
            index,
            amount: Number(quantities[index] ?? 0),
        }))
        .filter((entry) => {
            if (
                !entry.itemId ||
                IGNORED_STORAGE_IDS.has(entry.itemId) ||
                entry.amount < GREENSTACK_AMOUNT ||
                permanentIds.has(entry.itemId) ||
                seen.has(entry.itemId)
            )
                return false;

            seen.add(entry.itemId);
            return true;
        })
        .map((entry) => ({ ...entry, name: resolveItemName(entry.itemId, definitions) }));
};

const GreenstackRow = ({ entry, status }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span(
                    { class: "account-row__sub-label" },
                    entry.amount === undefined ? entry.itemId : `${entry.itemId} · ${largeFormatter(entry.amount)}`
                )
            ),
        ],
        badge: status,
        badgeClass: status === "PERMANENT" ? "account-row__badge--highlight" : "",
    });

export const GreenstacksTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Permanent Greenstacks" });
    const permanentEntries = van.state([]);
    const readyEntries = van.state([]);
    const searchQuery = van.state("");

    const filteredEntries = (entries) => {
        const query = searchQuery.val.trim().toLowerCase();
        return entries.val.filter(
            (entry) => !query || entry.name.toLowerCase().includes(query) || entry.itemId.toLowerCase().includes(query)
        );
    };

    const load = async () =>
        run(async () => {
            const [rawGreenstacks, rawOrder, rawQuantities] = await Promise.all([
                gga("GreenStacks"),
                gga("ChestOrder"),
                gga("ChestQuantity"),
            ]);
            const greenstacks = toIndexedArray(rawGreenstacks ?? []);
            const permanentIds = new Set(greenstacks.map((itemId) => String(itemId ?? "").trim()).filter(Boolean));
            const quantities = toIndexedArray(rawQuantities ?? []);
            const candidateIds = toIndexedArray(rawOrder ?? [])
                .map((itemId, index) => ({
                    itemId: String(itemId ?? "").trim(),
                    amount: Number(quantities[index] ?? 0),
                }))
                .filter(
                    (entry) =>
                        entry.itemId &&
                        !IGNORED_STORAGE_IDS.has(entry.itemId) &&
                        entry.amount >= GREENSTACK_AMOUNT &&
                        !permanentIds.has(entry.itemId)
                )
                .map((entry) => entry.itemId);
            const itemIds = [...new Set([...permanentIds, ...candidateIds])];
            const definitions = itemIds.length
                ? await readGgaEntries("ItemDefinitionsGET.h", itemIds, ["displayName", "DisplayName", "Name", "name"])
                : {};

            permanentEntries.val = buildPermanentEntries(greenstacks, definitions);
            readyEntries.val = buildReadyEntries(rawOrder, rawQuantities, permanentIds, definitions);
        });

    const renderRows = (entries, status, emptyText) => {
        const visible = filteredEntries(entries);
        return visible.length
            ? div(
                  { class: "account-item-stack account-item-stack--dense" },
                  ...visible.map((entry) => GreenstackRow({ entry, status }))
              )
            : div({ class: "tab-empty" }, searchQuery.val ? "No Greenstacks match this search." : emptyText);
    };

    load();

    return PersistentAccountListPage({
        title: "PERMANENT GREENSTACKS",
        description:
            "View permanently registered Greenstacks and storage stacks ready to register. Open storage in-game to register qualifying stacks.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        subNav: div(
            { class: "control-bar sticky-header" },
            SearchBar({
                placeholder: "SEARCH ITEM NAME OR ID",
                value: searchQuery,
                onInput: (value) => (searchQuery.val = value),
            })
        ),
        state: { loading, error },
        loadingText: "READING PERMANENT GREENSTACKS",
        errorTitle: "PERMANENT GREENSTACKS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "PERMANENT",
                note: () => `${filteredEntries(permanentEntries).length} / ${permanentEntries.val.length} REGISTERED`,
                body: () =>
                    renderRows(
                        permanentEntries,
                        "PERMANENT",
                        "No permanent Greenstacks yet. Open storage in-game to register qualifying stacks."
                    ),
            }),
            AccountSection({
                title: "READY TO REGISTER",
                note: () => `${filteredEntries(readyEntries).length} / ${readyEntries.val.length} READY`,
                body: () => renderRows(readyEntries, "READY", "No unregistered ten-million storage stacks found."),
            })
        ),
    });
};
