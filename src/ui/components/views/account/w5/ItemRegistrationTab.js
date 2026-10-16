import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { debounce, toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, useWriteStatus, writeVerified } from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, input, option, select, span } = van.tags;

/** Shared catalog editor for the independent Slab and Greenstack histories. */
export const ItemRegistrationTab = ({ label, historyPath, description }) => {
    const { loading, error, run: runLoad } = useAccountLoad({ label });
    const busy = van.state(false);
    const message = van.state("");
    const query = van.state("");
    const filter = van.state("all");
    const normalizedQuery = van.derive(() => query.val.trim().toLowerCase());
    const entries = van.state([]);
    const historyCount = van.state(0);
    const bulk = useWriteStatus();
    const rowStates = new Map();
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileRows = createStaticRowReconciler(listNode);
    let searchInputEl = null;

    const onSearchInput = debounce((value) => {
        query.val = value;
    }, 150);

    const isBusy = () => loading.val || busy.val;
    const cannotWrite = () => isBusy() || Boolean(error.val) || !entries.val.length;

    const matches = (itemId, search = normalizedQuery.val, status = filter.val) => {
        const state = rowStates.get(itemId);
        if (!state) return false;
        return (
            (status === "all" || state.registered.val === (status === "registered")) &&
            (!search || Boolean(state.searchKey?.includes(search)))
        );
    };

    const updateHistory = (history) => {
        const registered = new Set(history);
        historyCount.val = history.length;
        for (const itemId of entries.val) {
            const state = rowStates.get(itemId);
            if (state) state.registered.val = registered.has(itemId);
        }
    };

    const readHistory = async () => {
        const raw = await gga(historyPath);
        if (raw === null || raw === undefined) {
            throw new Error(`${label} registration history is unavailable. Refresh to try again.`);
        }
        if (historyPath === "GreenStacks" && !Array.isArray(raw)) {
            throw new Error("Greenstack registration history is invalid. Refresh to try again.");
        }
        const history =
            historyPath === "GreenStacks"
                ? raw
                : toIndexedArray(raw)
                      .map((itemId) => String(itemId ?? "").trim())
                      .filter((itemId) => itemId.length > 0);
        updateHistory(history);
        return history;
    };

    const applyHistory = async (history, targets, registered) => {
        const targetIds = new Set(targets);
        const historySet = new Set(history);
        const next = registered
            ? history.concat(targets.filter((itemId) => !historySet.has(itemId)))
            : history.filter((itemId) => !targetIds.has(itemId));
        if (next.length === history.length) return { cancelled: true };
        try {
            await writeVerified(historyPath, next);
            updateHistory(next);
        } catch (caughtError) {
            try {
                await readHistory();
            } catch (readError) {
                error.val = readError.message;
            }
            throw new Error(`Some changes may have applied and could not be verified. ${caughtError.message}`);
        }
    };

    const setItem = async (itemId, registered) => {
        if (cannotWrite()) return;
        busy.val = true;
        message.val = "";
        try {
            await rowStates.get(itemId).write.run(async () => applyHistory(await readHistory(), [itemId], registered), {
                onError: (caughtError) => (message.val = caughtError.message),
            });
        } finally {
            busy.val = false;
        }
    };

    const setShown = async (registered) => {
        if (cannotWrite()) return;
        const search = (searchInputEl?.value ?? query.val).trim().toLowerCase();
        if (searchInputEl && searchInputEl.value !== query.val) {
            query.val = searchInputEl.value;
        }
        busy.val = true;
        message.val = "";
        const status = filter.val;
        const getTargets = () =>
            entries.val.filter(
                (itemId) => matches(itemId, search, status) && rowStates.get(itemId)?.registered.val !== registered
            );
        try {
            await bulk.run(
                async () => {
                    await readHistory();
                    const targets = getTargets();
                    if (!targets.length) {
                        message.val = "No matching items need this change.";
                        return { cancelled: true };
                    }
                    const detail =
                        historyPath === "Cards[1]"
                            ? registered
                                ? " Adds registration history without granting physical items."
                                : " Removes all history occurrences for these items. Owned items may register again in W5 town."
                            : "";
                    if (
                        !window.confirm(
                            `${registered ? "Register" : "Unregister"} ${targets.length} shown ${label} items?${detail}`
                        )
                    ) {
                        return { cancelled: true };
                    }
                    const history = await readHistory();
                    const currentTargets = getTargets();
                    if (
                        targets.length !== currentTargets.length ||
                        !targets.every((id, idx) => id === currentTargets[idx])
                    ) {
                        message.val = `${label} targets changed while confirming. Bulk change cancelled; review and try again.`;
                        return { cancelled: true };
                    }
                    return applyHistory(history, targets, registered);
                },
                {
                    onError: (caughtError) => (message.val = caughtError.message),
                }
            );
        } finally {
            busy.val = false;
        }
    };

    const createRow = (itemId, state) => {
        const row = AccountRow({
            rowClass: "item-registration-row",
            status: state.write.status,
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, () => state.name.val),
                span({ class: "account-row__sub-label" }, itemId)
            ),
            badge: span({ role: "status", "aria-live": "polite", "aria-atomic": "true" }, () => {
                const status = state.write.status.val;
                return status === "loading"
                    ? "SAVING"
                    : status === "success"
                      ? "SAVED"
                      : status === "error"
                        ? "FAILED"
                        : state.registered.val
                          ? "REGISTERED"
                          : "MISSING";
            }),
            controls: ActionButton({
                label: () => (state.registered.val ? "UNREGISTER" : "REGISTER"),
                status: state.write.status,
                disabled: cannotWrite,
                tooltip: () => `${state.registered.val ? "Unregister" : "Register"} ${state.name.val}`,
                onClick: () => setItem(itemId, !state.registered.val),
            }),
        });
        return div(
            {
                "data-item-id": itemId,
                class: () => (matches(itemId) || state.write.status.val ? "" : "hidden"),
            },
            row
        );
    };

    const load = async () => {
        if (busy.val) return;
        busy.val = true;
        try {
            await runLoad(async () => {
                const rawCatalog = await readCList("SlabItemSort");
                const catalog = toIndexedArray(rawCatalog ?? [])
                    .map((itemId) => String(itemId ?? "").trim())
                    .filter((itemId) => itemId.length > 0);
                if (!catalog.length) {
                    throw new Error(`${label} catalog is unavailable or invalid.`);
                }
                const itemIds = [...new Set(catalog)];
                const definitions = await readGgaEntries("ItemDefinitionsGET.h", itemIds, ["displayName"]);
                for (const itemId of itemIds) {
                    const displayName = cleanName(definitions[itemId]?.displayName, itemId);
                    const searchKey = `${itemId} ${displayName}`.toLowerCase();
                    if (!rowStates.has(itemId)) {
                        rowStates.set(itemId, {
                            name: van.state(displayName),
                            searchKey,
                            registered: van.state(false),
                            write: useWriteStatus(),
                            node: null,
                        });
                    } else {
                        const state = rowStates.get(itemId);
                        state.name.val = displayName;
                        state.searchKey = searchKey;
                    }
                }
                entries.val = itemIds;
                await readHistory();
                reconcileRows(itemIds.join("|"), () =>
                    itemIds.map((itemId) => {
                        const state = rowStates.get(itemId);
                        if (!state.node) state.node = createRow(itemId, state);
                        return state.node;
                    })
                );
                const catalogIds = new Set(itemIds);
                for (const [itemId, state] of rowStates) {
                    if (!catalogIds.has(itemId)) {
                        state.write.clearStatus();
                        rowStates.delete(itemId);
                    }
                }
                message.val = "";
            });
        } finally {
            busy.val = false;
        }
    };

    load();

    searchInputEl = input({
        class: "item-registration-search",
        type: "search",
        placeholder: "Search name or item ID",
        "aria-label": `Search ${label} by name or item ID`,
        value: query,
        oninput: (event) => onSearchInput(event.target.value),
    });

    return PersistentAccountListPage({
        rootClass: "item-registration-tab tab-container",
        title: label.toUpperCase(),
        description,
        wrapActions: false,
        actions: div(
            { class: "item-registration-actions" },
            BulkActionBar({
                actions: [
                    {
                        label: "REGISTER SHOWN",
                        status: bulk.status,
                        disabled: cannotWrite,
                        onClick: () => setShown(true),
                    },
                    {
                        label: "UNREGISTER SHOWN",
                        status: bulk.status,
                        disabled: cannotWrite,
                        onClick: () => setShown(false),
                    },
                ],
                refresh: { onClick: load, disabled: isBusy },
            }),
            span({ class: "account-row__sub-label", role: "status", "aria-live": "polite" }, () => {
                const status = bulk.status.val;
                return status === "loading"
                    ? "Saving"
                    : status === "success"
                      ? "Saved"
                      : status === "error"
                        ? "Failed"
                        : "";
            })
        ),
        state: { loading, error },
        loadingText: `READING ${label.toUpperCase()}`,
        errorTitle: `${label.toUpperCase()} READ FAILED`,
        body: div(
            { class: "scrollable-panel content-stack" },
            div(
                { class: "item-registration-filters" },
                searchInputEl,
                select(
                    {
                        class: "select-base",
                        "aria-label": `${label} registration filter`,
                        value: filter,
                        onchange: (event) => (filter.val = event.target.value),
                    },
                    option({ value: "all" }, "All"),
                    option({ value: "registered" }, historyPath === "GreenStacks" ? "Greenstacked" : "Registered"),
                    option({ value: "missing" }, historyPath === "GreenStacks" ? "Not greenstacked" : "Missing")
                )
            ),
            div({ class: "account-section__note item-registration-summary", role: "status" }, () => {
                const search = normalizedQuery.val;
                const status = filter.val;
                let registered = 0;
                let matching = 0;
                for (const itemId of entries.val) {
                    const state = rowStates.get(itemId);
                    if (!state) continue;
                    if (state.registered.val) registered++;
                    if (matches(itemId, search, status)) matching++;
                }
                return `${registered} registered / ${entries.val.length - registered} missing catalog items · ${historyCount.val} total history entries · ${matching} matching`;
            }),
            div({ class: "write-status write-status--error", role: "alert" }, () => message.val),
            listNode
        ),
    });
};
