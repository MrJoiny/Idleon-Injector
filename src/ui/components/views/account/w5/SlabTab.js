import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, unwrapH, useWriteStatus, writeVerified } from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, input, option, select, span } = van.tags;
const HISTORY_PATH = "Cards[1]";

/** Edit the account's Slab registration history. */
export const SlabTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Slab" });
    const busy = van.state(false);
    const message = van.state("");
    const query = van.state("");
    const filter = van.state("all");
    const entries = van.state([]);
    const historyCount = van.state(0);
    const bulk = useWriteStatus();
    const rowStates = new Map();
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileRows = createStaticRowReconciler(listNode);
    let pageNode = null;

    const isBusy = () => loading.val || busy.val;
    const cannotWrite = () => isBusy() || Boolean(error.val) || !entries.val.length;
    const lockPage = () => {
        const focused = pageNode?.contains(document.activeElement) ? document.activeElement : null;
        let focusMoved = false;
        const trackFocus = (event) => {
            if (event.target !== focused) focusMoved = true;
        };
        const trackTab = (event) => {
            if (event.key === "Tab") focusMoved = true;
        };
        const trackBlur = () => (focusMoved = true);
        if (focused) {
            document.addEventListener("focusin", trackFocus);
            document.addEventListener("pointerdown", trackFocus);
            document.addEventListener("keydown", trackTab);
            window.addEventListener("blur", trackBlur);
        }
        busy.val = true;
        return () => {
            busy.val = false;
            if (!focused) return;
            setTimeout(() => {
                document.removeEventListener("focusin", trackFocus);
                document.removeEventListener("pointerdown", trackFocus);
                document.removeEventListener("keydown", trackTab);
                window.removeEventListener("blur", trackBlur);
                if (
                    !focusMoved &&
                    focused.isConnected &&
                    !focused.disabled &&
                    document.activeElement === document.body
                ) {
                    focused.focus();
                }
                for (const state of rowStates.values()) {
                    if (state.focused.val) state.focused.val = state.node.contains(document.activeElement);
                }
            }, 0);
        };
    };
    const matches = (itemId, search = query.val.trim().toLowerCase(), status = filter.val) => {
        const state = rowStates.get(itemId);
        return (
            (status === "all" || state.registered.val === (status === "registered")) &&
            (!search || itemId.toLowerCase().includes(search) || state.name.val.toLowerCase().includes(search))
        );
    };

    const updateHistory = (history) => {
        const registered = new Set(history);
        historyCount.val = history.length;
        for (const itemId of entries.val) rowStates.get(itemId).registered.val = registered.has(itemId);
    };

    const readHistory = async () => {
        try {
            const history = await gga(HISTORY_PATH);
            if (!Array.isArray(history) || history.some((itemId) => typeof itemId !== "string" || !itemId.length)) {
                throw new Error("Slab history is unavailable or invalid. Refresh to try again.");
            }
            updateHistory(history);
            return history;
        } catch (caughtError) {
            error.val = caughtError.message;
            throw caughtError;
        }
    };

    const applyHistory = async (history, targets, registered) => {
        const targetIds = new Set(targets);
        const next = registered
            ? history.concat(targets.filter((itemId) => !history.includes(itemId)))
            : history.filter((itemId) => !targetIds.has(itemId));
        if (next.length === history.length) return;
        try {
            await writeVerified(HISTORY_PATH, next);
            updateHistory(next);
        } catch (caughtError) {
            try {
                await readHistory();
            } catch {
                // readHistory blocks further edits until a successful refresh.
            }
            throw new Error(`Some changes may have applied and could not be verified. ${caughtError.message}`);
        }
    };

    const setItem = async (itemId, registered) => {
        if (cannotWrite()) return;
        const unlock = lockPage();
        message.val = "";
        try {
            await rowStates.get(itemId).write.run(async () => applyHistory(await readHistory(), [itemId], registered), {
                onError: (caughtError) => (message.val = caughtError.message),
            });
        } finally {
            unlock();
        }
    };

    const setShown = async (registered) => {
        if (cannotWrite()) return;
        const unlock = lockPage();
        message.val = "";
        const search = query.val.trim().toLowerCase();
        const status = filter.val;
        const getTargets = () =>
            entries.val.filter(
                (itemId) => matches(itemId, search, status) && rowStates.get(itemId).registered.val !== registered
            );
        try {
            await readHistory();
            const targets = getTargets();
            if (!targets.length) {
                message.val = "No matching items need this change.";
                return;
            }
            if (
                !window.confirm(
                    `${registered ? "Register" : "Unregister"} ${targets.length} shown Slab items? ${
                        registered
                            ? "Adds registration history without granting physical items."
                            : "Removes all history occurrences for these items. Owned items may register again in W5 town."
                    }`
                )
            )
                return;
            const history = await readHistory();
            if (JSON.stringify(targets) !== JSON.stringify(getTargets())) {
                message.val = "Slab targets changed while confirming. Bulk change cancelled; review and try again.";
                return;
            }
            await bulk.run(
                async () => {
                    const task = applyHistory(history, targets, registered);
                    await Promise.all(targets.map((itemId) => rowStates.get(itemId).write.run(() => task)));
                    await task;
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } catch (caughtError) {
            message.val = caughtError.message;
        } finally {
            unlock();
        }
    };

    const createRow = (itemId, state) => {
        const row = AccountRow({
            rowClass: "slab-row",
            status: state.write.status,
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, () => state.name.val),
                span({ class: "account-row__sub-label" }, itemId)
            ),
            badge: () => (state.registered.val ? "REGISTERED" : "MISSING"),
            controls: [
                span({ class: "write-status", role: "status" }, () => {
                    const status = state.write.status.val;
                    return status === "loading"
                        ? "SAVING"
                        : status === "success"
                          ? "SAVED"
                          : status === "error"
                            ? "FAILED"
                            : "";
                }),
                ActionButton({
                    label: () => (state.registered.val ? "UNREGISTER" : "REGISTER"),
                    status: state.write.status,
                    disabled: cannotWrite,
                    tooltip: () => `${state.registered.val ? "Unregister" : "Register"} ${state.name.val}`,
                    onClick: () => setItem(itemId, !state.registered.val),
                }),
            ],
        });
        return div(
            {
                class: "slab-item",
                "data-item-id": itemId,
                style: () => (matches(itemId) || state.write.status.val || state.focused.val ? "" : "display: none;"),
                onfocusin: () => (state.focused.val = true),
                onfocusout: (event) => {
                    if (!busy.val || event.relatedTarget) {
                        state.focused.val = event.currentTarget.contains(event.relatedTarget);
                    }
                },
            },
            row
        );
    };

    const load = async () => {
        if (busy.val) return;
        const unlock = lockPage();
        try {
            await runLoad(async () => {
                const catalog = await readCList("SlabItemSort");
                if (
                    !Array.isArray(catalog) ||
                    !catalog.length ||
                    catalog.some((itemId) => typeof itemId !== "string" || !itemId.length)
                ) {
                    throw new Error("Slab catalog is unavailable or invalid.");
                }
                const itemIds = [...new Set(catalog)];
                const definitions = await readGgaEntries("ItemDefinitionsGET.h", itemIds, ["displayName"]);
                for (const itemId of itemIds) {
                    if (!rowStates.has(itemId)) {
                        rowStates.set(itemId, {
                            name: van.state(itemId),
                            registered: van.state(false),
                            focused: van.state(false),
                            write: useWriteStatus(),
                            node: null,
                        });
                    }
                    const state = rowStates.get(itemId);
                    state.name.val = cleanName(unwrapH(definitions[itemId])?.displayName, itemId);
                }
                entries.val = itemIds;
                await readHistory();
                reconcileRows(JSON.stringify(itemIds), () =>
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
            unlock();
        }
    };

    load();

    return (pageNode = PersistentAccountListPage({
        rootClass: "slab-tab tab-container",
        title: "SLAB",
        description:
            "Edit item registration history. Owned items may register again during W5 town sync. Count bonuses depend on artifacts and upgrades; the game refreshes derived displays.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                { label: "REGISTER SHOWN", status: bulk.status, disabled: cannotWrite, onClick: () => setShown(true) },
                {
                    label: "UNREGISTER SHOWN",
                    status: bulk.status,
                    disabled: cannotWrite,
                    onClick: () => setShown(false),
                },
            ],
            refresh: { onClick: load, disabled: isBusy },
        }),
        state: { loading, error },
        loadingText: "READING SLAB",
        errorTitle: "SLAB READ FAILED",
        body: div(
            { class: "scrollable-panel content-stack" },
            div(
                { class: "slab-filters" },
                input({
                    class: "input-base slab-search",
                    type: "search",
                    placeholder: "Search name or item ID",
                    "aria-label": "Search Slab by name or item ID",
                    value: query,
                    disabled: isBusy,
                    oninput: (event) => (query.val = event.target.value),
                }),
                select(
                    {
                        class: "select-base",
                        "aria-label": "Slab registration filter",
                        value: filter,
                        disabled: isBusy,
                        onchange: (event) => (filter.val = event.target.value),
                    },
                    option({ value: "all" }, "All"),
                    option({ value: "registered" }, "Registered"),
                    option({ value: "missing" }, "Missing")
                )
            ),
            div({ class: "account-section__note slab-summary", role: "status" }, () => {
                const registered = entries.val.filter((itemId) => rowStates.get(itemId).registered.val).length;
                const matching = entries.val.filter((itemId) => matches(itemId)).length;
                return `${registered} registered / ${entries.val.length - registered} missing catalog items · ${historyCount.val} total history entries · ${matching} matching`;
            }),
            div({ class: "write-status write-status--error", role: "alert" }, () => message.val),
            listNode
        ),
    }));
};
