import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, useWriteStatus, writeManyVerified } from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span } = van.tags;
const STATUS_PATH = "BribeStatus";

/** Edit account-wide bribe ownership without spending coins. */
export const BribesTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Bribes" });
    const busy = van.state(false);
    const message = van.state("");
    const bulk = useWriteStatus();
    const rowStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);
    let entries = [];

    const isBusy = () => loading.val || busy.val;
    const cannotWrite = () => isBusy() || Boolean(error.val) || !entries.length;

    const readStatuses = async () => {
        const raw = await gga(STATUS_PATH);
        if (raw === null || raw === undefined) {
            throw new Error("Bribe ownership data is unavailable. Refresh to try again.");
        }
        const values = toIndexedArray(raw).map(Number);
        const resolvedValues = [];
        for (const entry of entries) {
            const val = values[entry.index] ?? -1;
            if (![-1, 0, 1].includes(val)) {
                throw new Error("Bribe ownership data is unavailable or invalid. Refresh to try again.");
            }
            resolvedValues[entry.index] = val;
            rowStates.get(entry.index).value.val = val;
        }
        return resolvedValues;
    };

    const applyWrites = async (writes) => {
        if (!writes.length) return;
        try {
            await writeManyVerified(writes);
            for (const { index, value } of writes) rowStates.get(index).value.val = value;
        } catch (caughtError) {
            try {
                await readStatuses();
            } catch (readError) {
                error.val = readError.message;
            }
            throw new Error(`Some changes may have applied. ${caughtError.message}`);
        }
    };

    const setBribe = async (entry, enabled) => {
        if (cannotWrite() || entry.readOnly) return;
        busy.val = true;
        message.val = "";
        try {
            await rowStates.get(entry.index).write.run(
                async () => {
                    const values = await readStatuses();
                    const writes = [];
                    const addWrite = (index, value) => writes.push({ index, path: `${STATUS_PATH}[${index}]`, value });
                    if (enabled) {
                        if (values[entry.index] === 1) return;
                        addWrite(entry.index, 1);
                        for (let index = entry.start; index < entry.start + entry.count; index++) {
                            if (values[index] === -1) addWrite(index, 0);
                        }
                    } else {
                        if (values[entry.index] !== 1) return;
                        addWrite(entry.index, 0);
                    }
                    await applyWrites(writes);
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } finally {
            busy.val = false;
        }
    };

    const setAll = async (enabled) => {
        if (cannotWrite()) return;
        busy.val = true;
        message.val = "";
        try {
            const values = await readStatuses();
            const targets = entries.filter(
                (entry) => !entry.readOnly && (enabled ? values[entry.index] !== 1 : values[entry.index] === 1)
            );
            if (!targets.length) return;
            if (
                !window.confirm(
                    `${enabled ? "Enable" : "Disable"} ${targets.length} bribes? ${
                        enabled
                            ? "Grants ownership without spending coins."
                            : "Removes ownership. Locked bribes stay locked."
                    }`
                )
            )
                return;
            await bulk.run(
                () =>
                    applyWrites(
                        targets.map(({ index }) => ({
                            index,
                            path: `${STATUS_PATH}[${index}]`,
                            value: enabled ? 1 : 0,
                        }))
                    ),
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
        } catch (caughtError) {
            message.val = caughtError.message;
        } finally {
            busy.val = false;
        }
    };

    const renderRow = (entry) => {
        const state = rowStates.get(entry.index);
        return AccountRow({
            rowClass: "bribes-row",
            status: state.write.status,
            info: div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "bribes-row__bonus" }, entry.bonus)
            ),
            badge: () => (state.value.val === 1 ? "OWNED" : state.value.val === 0 ? "AVAILABLE" : "LOCKED"),
            controls: entry.readOnly
                ? span({ class: "write-status" }, "READ ONLY")
                : [
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
                          label: () => (state.value.val === 1 ? "DISABLE" : "ENABLE"),
                          status: state.write.status,
                          disabled: cannotWrite,
                          tooltip: () =>
                              state.value.val === 1
                                  ? `Disable ${entry.name}`
                                  : `Enable ${entry.name} without spending coins`,
                          onClick: () => setBribe(entry, state.value.val !== 1),
                      }),
                  ],
        });
    };

    const load = () => {
        if (busy.val) return;
        return runLoad(async () => {
            const definitions = toIndexedArray(await readCList("BribeDescriptions"));
            if (!definitions.length) throw new Error("Bribe definitions are unavailable.");
            entries = definitions.map((raw, index) => {
                const definition = toIndexedArray(raw);
                const expansion = definition[4] === "BribeExpansion";
                let [start, count] = expansion
                    ? String(definition[5] ?? "")
                          .split("&")
                          .map(Number)
                    : [0, 0];
                const validExpansion =
                    expansion &&
                    Number.isInteger(start) &&
                    Number.isInteger(count) &&
                    count >= 0 &&
                    (count === 0 || (start >= 0 && start + count <= definitions.length));

                const isPlaceholder = expansion && (!validExpansion || count === 0);
                if (!validExpansion) {
                    start = 0;
                    count = 0;
                }
                if (!rowStates.has(index)) rowStates.set(index, { value: van.state(-1), write: useWriteStatus() });
                return {
                    index,
                    name: cleanName(definition[0], `Bribe ${index + 1}`),
                    bonus: isPlaceholder ? "No bonus. Unpurchasable placeholder." : cleanName(definition[1]),
                    start,
                    count,
                    readOnly: isPlaceholder,
                };
            });
            await readStatuses();
            reconcileRows(JSON.stringify(entries), () => entries.map(renderRow));
            message.val = "";
        });
    };

    load();

    return PersistentAccountListPage({
        rootClass: "bribes-tab tab-container",
        title: "BRIBES",
        description:
            "Edit account-wide ownership without spending coins. Enabling an expansion unlocks its next group.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                { label: "ENABLE ALL", status: bulk.status, disabled: cannotWrite, onClick: () => setAll(true) },
                { label: "DISABLE ALL", status: bulk.status, disabled: cannotWrite, onClick: () => setAll(false) },
            ],
            refresh: { onClick: load, disabled: isBusy },
        }),
        state: { loading, error },
        loadingText: "READING BRIBES",
        errorTitle: "BRIBES READ FAILED",
        body: div(
            { class: "scrollable-panel content-stack" },
            div({ class: "write-status write-status--error", role: "alert" }, () => message.val),
            listNode
        ),
    });
};
