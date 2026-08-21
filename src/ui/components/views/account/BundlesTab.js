import van from "../../../vendor/van-1.6.0.js";
import { SearchBar } from "../../../components/SearchBar.js";
import { executeCheatAction, fetchBundleCatalog, gga } from "../../../services/api.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { AccountRow } from "./components/AccountRow.js";
import { AccountSection } from "./components/AccountSection.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { createStaticRowReconciler, writeVerified } from "./accountShared.js";

const { div, span, button, h3, p } = van.tags;

const BUNDLES_RECEIVED_PATH = "BundlesReceived.h";
const BUY_POLL_INTERVAL_MS = 1000;
const BUY_POLL_ATTEMPTS = 10;
const BUY_ALL_CONFIRMATION_SECONDS = 5;
const PLAYER_SELECTION_MESSAGE =
    "Select a character in-game before buying bundles. Without an active character, bundle items would not be delivered.";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isOwned = (owned) => Number(owned) === 1;
const bundlePath = (code) => `${BUNDLES_RECEIVED_PATH}.${code}`;

const matchesSearch = (bundle, query) => {
    const normalizedQuery = String(query ?? "")
        .trim()
        .toLowerCase();
    return !normalizedQuery || `${bundle.name} ${bundle.code}`.toLowerCase().includes(normalizedQuery);
};

const BundleRow = ({ bundle, state, searchQuery, buyAllStatus, onBuy, onUnbuy }) =>
    div(
        {
            class: "bundle-row-wrap",
            hidden: () => !matchesSearch(bundle, searchQuery.val),
        },
        AccountRow({
            status: () => (state.status.val === "success" ? "success" : state.status.val === "error" ? "error" : null),
            rowClass: "bundle-row",
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, bundle.name),
                span({ class: "account-row__sub-label bundle-row__code" }, bundle.code),
                () =>
                    state.pending.val
                        ? span({ class: "bundle-row__pending" }, "WAITING FOR LIVE OWNERSHIP CONFIRMATION")
                        : null
            ),
            badge: () => {
                if (state.pending.val) return "BUY QUEUED";
                return isOwned(state.owned.val) ? "OWNED" : "NOT OWNED";
            },
            badgeClass: () => {
                if (state.pending.val) return "bundle-row__badge bundle-row__badge--queued";
                return isOwned(state.owned.val)
                    ? "bundle-row__badge bundle-row__badge--owned"
                    : "bundle-row__badge bundle-row__badge--unowned";
            },
            controlsClass: "bundle-row__controls",
            controls: button(
                {
                    type: "button",
                    class: () =>
                        isOwned(state.owned.val) ? "btn-danger bundle-row__action" : "btn-primary bundle-row__action",
                    disabled: () =>
                        buyAllStatus.val === "loading" || state.pending.val || state.status.val === "loading",
                    onclick: () => {
                        if (buyAllStatus.val === "loading" || state.pending.val || state.status.val === "loading")
                            return;
                        return isOwned(state.owned.val) ? onUnbuy(bundle, state) : onBuy(bundle, state);
                    },
                },
                () => {
                    if (state.pending.val) return "BUY QUEUED";
                    if (state.status.val === "loading") return "UNBUYING";
                    return isOwned(state.owned.val) ? "UNBUY" : "BUY";
                }
            ),
        })
    );

const BuyAllConfirmationModal = ({ open, countdown, bundleCount, status, onCancel, onConfirm }) =>
    div(
        {
            class: () => `modal bundles-buy-all-modal ${open.val ? "" : "is-hidden"}`,
            onclick: () => {
                if (status.val !== "loading") onCancel();
            },
        },
        div(
            { class: "modal-box bundles-buy-all-modal__box", onclick: (event) => event.stopPropagation() },
            div({ class: "modal-header" }, h3("BUY ALL BUNDLES?")),
            div(
                { class: "modal-body bundles-buy-all-modal__body" },
                p(() => `Are you sure you want to buy all ${bundleCount.val} currently unowned bundles?`),
                p(
                    { class: "bundles-buy-all-modal__warning" },
                    "Make sure you have a lot of inventory space for all the items in the bundles."
                ),
                p({ class: "bundles-buy-all-modal__countdown" }, () =>
                    countdown.val > 0
                        ? `You can confirm in ${countdown.val} second${countdown.val === 1 ? "" : "s"}.`
                        : "You can now confirm."
                )
            ),
            div(
                { class: "modal-footer" },
                button(
                    {
                        type: "button",
                        class: "btn-secondary",
                        disabled: () => status.val === "loading",
                        onclick: onCancel,
                    },
                    "CANCEL"
                ),
                button(
                    {
                        type: "button",
                        class: "btn-primary",
                        disabled: () => countdown.val > 0 || status.val === "loading" || bundleCount.val === 0,
                        onclick: onConfirm,
                    },
                    () => {
                        if (status.val === "loading") return "BUYING...";
                        return countdown.val > 0 ? `OK (${countdown.val})` : "BUY ALL";
                    }
                )
            )
        )
    );

export const BundlesTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Bundles" });
    const catalogState = van.state([]);
    const searchQuery = van.state("");
    const bundleStates = new Map();
    const purchaseBlockMessage = van.state(null);
    const buyAllDialogOpen = van.state(false);
    const buyAllCountdown = van.state(0);
    const buyAllTargetCount = van.state(0);
    const buyAllStatus = van.state("idle");
    const listNode = div({ class: "account-item-stack bundles-list" });
    const reconcileRows = createStaticRowReconciler(listNode);
    let catalogCache = [];
    let buyAllCountdownTimer = null;

    const resetBuyAllStatusAfter = (status, delayMs) => {
        setTimeout(() => {
            if (buyAllStatus.val === status) buyAllStatus.val = "idle";
        }, delayMs);
    };

    const getBundleState = (code, owned = 0) => {
        if (!bundleStates.has(code)) {
            bundleStates.set(code, {
                owned: van.state(isOwned(owned) ? 1 : 0),
                pending: van.state(false),
                status: van.state("idle"),
                statusResetTimer: null,
            });
        }
        return bundleStates.get(code);
    };

    const getBuyableBundles = () =>
        catalogState.val.filter((bundle) => {
            const state = getBundleState(bundle.code, bundle.owned);
            return !isOwned(state.owned.val) && !state.pending.val;
        });

    const buyableCount = van.derive(() => getBuyableBundles().length);

    const clearStatusResetTimer = (state) => {
        if (state.statusResetTimer !== null) {
            clearTimeout(state.statusResetTimer);
            state.statusResetTimer = null;
        }
    };

    const resetStatusAfter = (state, delayMs) => {
        clearStatusResetTimer(state);
        state.statusResetTimer = setTimeout(() => {
            state.status.val = "idle";
            state.statusResetTimer = null;
        }, delayMs);
    };

    const markPurchaseSucceeded = (state) => {
        state.pending.val = false;
        state.status.val = "success";
        resetStatusAfter(state, 1200);
    };

    const markPurchaseFailed = (state) => {
        state.pending.val = false;
        state.status.val = "error";
        resetStatusAfter(state, 1800);
    };

    const ensurePlayerSelected = async () => {
        try {
            const player = await gga("UserInfo[0]");
            if (player !== null && player !== undefined) {
                purchaseBlockMessage.val = null;
                return true;
            }
        } catch (caughtError) {
            console.error("[bundles] Active character check failed:", caughtError);
            purchaseBlockMessage.val = "Could not verify the selected character. Select a character and try again.";
            return false;
        }

        purchaseBlockMessage.val = PLAYER_SELECTION_MESSAGE;
        return false;
    };

    const clearBuyAllCountdown = () => {
        if (buyAllCountdownTimer !== null) {
            clearInterval(buyAllCountdownTimer);
            buyAllCountdownTimer = null;
        }
    };

    const closeBuyAllDialog = () => {
        clearBuyAllCountdown();
        buyAllDialogOpen.val = false;
        buyAllCountdown.val = 0;
    };

    const openBuyAllDialog = async () => {
        if (buyAllStatus.val === "loading" || buyableCount.val === 0) return;
        if (!(await ensurePlayerSelected())) return;

        clearBuyAllCountdown();
        buyAllTargetCount.val = buyableCount.val;
        buyAllCountdown.val = BUY_ALL_CONFIRMATION_SECONDS;
        buyAllDialogOpen.val = true;
        buyAllCountdownTimer = setInterval(() => {
            buyAllCountdown.val = Math.max(0, buyAllCountdown.val - 1);
            if (buyAllCountdown.val === 0) clearBuyAllCountdown();
        }, 1000);
    };

    const totals = van.derive(() => {
        const bundles = catalogState.val;
        const owned = bundles.filter((bundle) => isOwned(getBundleState(bundle.code).owned.val)).length;
        const queued = bundles.filter((bundle) => getBundleState(bundle.code).pending.val).length;
        return { total: bundles.length, owned, queued };
    });

    const applyCatalog = (catalog) => {
        catalogCache = [...catalog].sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
        catalogState.val = catalogCache;

        for (const bundle of catalogCache) {
            const state = getBundleState(bundle.code, bundle.owned);
            state.owned.val = bundle.owned;
            if (bundle.owned === 1) state.pending.val = false;
        }

        reconcileRows(catalogCache.map((bundle) => `${bundle.code}:${bundle.name}`).join("|"), () =>
            catalogCache.map((bundle) =>
                BundleRow({
                    bundle,
                    state: getBundleState(bundle.code, bundle.owned),
                    searchQuery,
                    buyAllStatus,
                    onBuy: buyBundle,
                    onUnbuy: unbuyBundle,
                })
            )
        );
    };

    const refreshCatalog = async () => {
        applyCatalog(await fetchBundleCatalog());
        return catalogCache;
    };

    const pollForOwnership = async (code, state) => {
        for (let attempt = 0; attempt < BUY_POLL_ATTEMPTS; attempt += 1) {
            await delay(BUY_POLL_INTERVAL_MS);
            await refreshCatalog();
            if (isOwned(state.owned.val)) return true;
        }
        return false;
    };

    const pollForOwnershipBatch = async (entries) => {
        const pendingEntries = new Map(entries.map(({ bundle, state }) => [bundle.code, state]));

        for (let attempt = 0; attempt < BUY_POLL_ATTEMPTS && pendingEntries.size; attempt += 1) {
            await delay(BUY_POLL_INTERVAL_MS);
            await refreshCatalog();

            for (const [code, state] of pendingEntries) {
                if (!isOwned(state.owned.val)) continue;
                markPurchaseSucceeded(state);
                pendingEntries.delete(code);
            }
        }

        return pendingEntries;
    };

    const queueBundleBuy = async (bundle, state) => {
        clearStatusResetTimer(state);
        state.pending.val = true;
        state.status.val = "idle";

        try {
            await executeCheatAction(`buy ${bundle.code}`);
            return true;
        } catch (caughtError) {
            console.error(`[bundles] Buy failed for ${bundle.code}:`, caughtError);
            markPurchaseFailed(state);
            return false;
        }
    };

    async function buyBundle(bundle, state) {
        if (buyAllStatus.val === "loading" || isOwned(state.owned.val) || state.pending.val) return;
        if (!(await ensurePlayerSelected())) {
            markPurchaseFailed(state);
            return;
        }

        if (!(await queueBundleBuy(bundle, state))) return;

        try {
            const confirmed = await pollForOwnership(bundle.code, state);
            if (confirmed) {
                markPurchaseSucceeded(state);
            } else {
                markPurchaseFailed(state);
            }
        } catch (caughtError) {
            console.error(`[bundles] Ownership poll failed for ${bundle.code}:`, caughtError);
            markPurchaseFailed(state);
        }
    }

    async function buyAllBundles() {
        if (buyAllCountdown.val > 0 || buyAllStatus.val === "loading") return;
        buyAllStatus.val = "loading";
        if (!(await ensurePlayerSelected())) {
            closeBuyAllDialog();
            buyAllStatus.val = "error";
            resetBuyAllStatusAfter("error", 1800);
            return;
        }

        const bundles = getBuyableBundles();
        closeBuyAllDialog();
        if (!bundles.length) {
            buyAllStatus.val = "idle";
            return;
        }

        const queued = [];
        let queueRequestFailed = false;

        for (const bundle of bundles) {
            const state = getBundleState(bundle.code, bundle.owned);
            if (await queueBundleBuy(bundle, state)) queued.push({ bundle, state });
            else queueRequestFailed = true;
        }

        if (!queued.length) {
            buyAllStatus.val = "error";
            resetBuyAllStatusAfter("error", 1800);
            return;
        }

        try {
            const pending = await pollForOwnershipBatch(queued);
            for (const state of pending.values()) markPurchaseFailed(state);

            const completed = !queueRequestFailed && pending.size === 0;
            buyAllStatus.val = completed ? "success" : "error";
            resetBuyAllStatusAfter(completed ? "success" : "error", completed ? 1200 : 1800);
        } catch (caughtError) {
            console.error("[bundles] Ownership poll failed after Buy All:", caughtError);
            for (const { state } of queued) {
                if (!isOwned(state.owned.val)) markPurchaseFailed(state);
            }
            buyAllStatus.val = "error";
            resetBuyAllStatusAfter("error", 1800);
        }
    }

    async function unbuyBundle(bundle, state) {
        if (buyAllStatus.val === "loading" || !isOwned(state.owned.val) || state.pending.val) return;

        clearStatusResetTimer(state);
        state.status.val = "loading";
        try {
            // Unbuy is deliberately the only direct ownership write, and it can
            // only write 0. writeVerified reads the flag back before this updates.
            await writeVerified(bundlePath(bundle.code), 0);
            state.owned.val = 0;
            state.pending.val = false;
            state.status.val = "success";
            resetStatusAfter(state, 1200);
        } catch (caughtError) {
            console.error(`[bundles] Unbuy failed for ${bundle.code}:`, caughtError);
            markPurchaseFailed(state);
        }
    }

    const load = () => runLoad(refreshCatalog);
    load();

    const playerSelectionWarning = div(
        { hidden: () => !purchaseBlockMessage.val },
        WarningBanner(() => purchaseBlockMessage.val)
    );

    const body = div(
        { class: "scrollable-panel content-stack bundles-scroll" },
        div(
            { class: "bundles-search" },
            SearchBar({
                placeholder: "SEARCH BUNDLES OR CODES",
                value: searchQuery,
                debounceMs: 0,
                onInput: (value) => (searchQuery.val = value),
            })
        ),
        AccountSection({
            title: "BUNDLE CATALOG",
            note: () => {
                const value = totals.val;
                const queueLabel = value.queued ? `, ${value.queued} QUEUED` : "";
                return `${value.total} BUNDLES, ${value.owned} OWNED, ${value.total - value.owned} NOT OWNED${queueLabel}`;
            },
            body: () =>
                catalogState.val.length
                    ? listNode
                    : div({ class: "tab-empty" }, "No bundle codes were returned by the running game."),
        }),
        BuyAllConfirmationModal({
            open: buyAllDialogOpen,
            countdown: buyAllCountdown,
            bundleCount: buyAllTargetCount,
            status: buyAllStatus,
            onCancel: closeBuyAllDialog,
            onConfirm: buyAllBundles,
        })
    );

    return PersistentAccountListPage({
        title: "BUNDLES",
        description:
            "Buy bundles and see which ones your account has received. Unbuy lets you mark a bundle as not received again, but does not remove its items from the Slab.",
        actions: [
            button(
                {
                    type: "button",
                    class: "btn-primary bundles-buy-all-button",
                    disabled: () =>
                        loading.val || buyAllDialogOpen.val || buyAllStatus.val === "loading" || buyableCount.val === 0,
                    onclick: openBuyAllDialog,
                },
                () => {
                    if (buyAllStatus.val === "loading") return "BUYING ALL...";
                    if (buyAllStatus.val === "error") return "BUY ALL FAILED";
                    return `BUY ALL (${buyableCount.val})`;
                }
            ),
            RefreshButton({
                onRefresh: load,
                tooltip: "Re-read bundle names, codes, and ownership from the running game.",
                disabled: () => loading.val || buyAllStatus.val === "loading",
            }),
        ],
        topNotices: [WarningBanner("Bundles do not provide gems or pets."), playerSelectionWarning],
        state: { loading, error },
        loadingText: "READING BUNDLES",
        errorTitle: "BUNDLE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
