import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { cleanName, createStaticRowReconciler, unwrapH, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span, p } = van.tags;
const OWNERSHIP_PATH = "OptionsListAccount[311]";
const ROW_NOTES = {
    7: "Adds 17% to vote bonuses. Royal Vote Button adds a separate 13%, for 30% together.",
    10: "Adds 12 storage slots independently. Reenter town to update storage capacity.",
    11: "Adds 16 storage slots independently. Reenter town to update storage capacity.",
    16: "Adds 13% to vote bonuses. Gilded Vote Button adds a separate 17%, for 30% together.",
    50: "Enabling ownership grants no cardifiers and prevents the normal purchase. Disabling removes none. The normal purchase grants eight six-star cardifiers.",
};

const readIndexedMetadata = (raw, label) => {
    const source = unwrapH(raw);
    const values = toIndexedArray(source);
    if (
        !values.length ||
        Object.keys(source).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= values.length)
    ) {
        throw new Error(`Invalid ${label} metadata. Refresh after checking the game connection.`);
    }
    return values;
};

const readSnapshot = async () => {
    const [rawCatalog, rawCodes, ownership] = await Promise.all([
        readCList("NinjaInfo[39]"),
        gga("Number2Letter"),
        gga(OWNERSHIP_PATH),
    ]);
    const definitions = readIndexedMetadata(rawCatalog, "Eventshop catalog");
    const codes = readIndexedMetadata(rawCodes, "ownership encoding");
    if (definitions.length % 2 !== 0 || typeof ownership !== "string") {
        throw new Error("Invalid Eventshop catalog or ownership string. Refresh before editing.");
    }

    const catalog = [];
    const usedCodes = new Set();
    for (let index = 0; index < definitions.length / 2; index++) {
        const descriptor = definitions[index * 2];
        const cost = definitions[index * 2 + 1];
        const code = codes[index];
        if (
            typeof descriptor !== "string" ||
            descriptor.indexOf("@") <= 0 ||
            !cleanName(descriptor.slice(0, descriptor.indexOf("@"))) ||
            !cleanName(descriptor.slice(descriptor.indexOf("@") + 1)) ||
            !["number", "string"].includes(typeof cost) ||
            String(cost).trim() === "" ||
            !Number.isFinite(Number(cost)) ||
            Number(cost) < 0 ||
            typeof code !== "string" ||
            Array.from(code).length !== 1 ||
            usedCodes.has(code)
        ) {
            throw new Error(`Invalid Eventshop metadata for upgrade ${index}. Refresh before editing.`);
        }
        usedCodes.add(code);
        const separator = descriptor.indexOf("@");
        catalog.push({
            index,
            code,
            name: cleanName(descriptor.slice(0, separator)),
            effect: cleanName(descriptor.slice(separator + 1)),
            cost: Number(cost),
        });
    }
    return { catalog, ownership };
};

/** Edit Eventshop ownership flags without spending points or granting purchase rewards. */
export const EventshopTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Eventshop" });
    const busy = van.state(false);
    const ready = van.state(false);
    const notice = van.state("");
    const bulkEnable = useWriteStatus();
    const bulkDisable = useWriteStatus();
    const rows = new Map();
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const applySnapshot = ({ catalog, ownership }) => {
        for (const entry of catalog) {
            if (!rows.has(entry.index)) {
                rows.set(entry.index, { entry: van.state(entry), owned: van.state(false), feedback: useWriteStatus() });
            }
            const row = rows.get(entry.index);
            row.entry.val = entry;
            row.owned.val = ownership.includes(entry.code);
        }
        reconcileRows(catalog.map((entry) => entry.index).join(","), () =>
            catalog.map(({ index }) => {
                const row = rows.get(index);
                const action = ActionButton({
                    label: () => {
                        if (row.feedback.status.val === "loading") return "SAVING…";
                        if (row.feedback.status.val === "success") return "VERIFIED";
                        if (row.feedback.status.val === "error") return "FAILED";
                        return row.owned.val ? "DISABLE" : "ENABLE";
                    },
                    variant: "max-reset",
                    status: row.feedback.status,
                    disabled: () => busy.val || !ready.val,
                    tooltip: () =>
                        `${row.owned.val ? "Disable" : "Enable"} ownership for ${row.entry.val.name}. No event points spent.`,
                    onClick: () => setOwnership(!row.owned.val, index, row.feedback),
                });
                van.derive(() => {
                    action.setAttribute(
                        "aria-label",
                        `${row.owned.val ? "Disable" : "Enable"} ownership for ${row.entry.val.name}`
                    );
                });
                return AccountRow({
                    rowClass: "eventshop-row",
                    status: row.feedback.status,
                    info: div(
                        { class: "account-row__name-group" },
                        span({ class: "account-row__name" }, () => row.entry.val.name),
                        span({ class: "account-row__sub-label" }, () => row.entry.val.effect),
                        span({ class: "account-row__sub-label" }, () => `Cost: ${row.entry.val.cost} event points`),
                        ROW_NOTES[index] ? span({ class: "eventshop-row__note" }, ROW_NOTES[index]) : null
                    ),
                    badge: () => (row.owned.val ? "OWNED" : "NOT OWNED"),
                    badgeClass: () => (row.owned.val ? "account-row__badge--highlight" : ""),
                    controls: action,
                });
            })
        );
        ready.val = true;
    };

    const load = async () => {
        if (busy.val) return;
        busy.val = true;
        ready.val = false;
        notice.val = "";
        try {
            await runLoad(async () => applySnapshot(await readSnapshot()));
        } finally {
            busy.val = false;
        }
    };

    const setOwnership = async (enabled, index, feedback) => {
        if (busy.val || !ready.val) return;
        busy.val = true;
        notice.val = "";
        let attemptedWrite = false;
        try {
            await feedback.run(
                async () => {
                    try {
                        const snapshot = await readSnapshot();
                        applySnapshot(snapshot);
                        const targets = snapshot.catalog.filter(
                            (entry) =>
                                (index === null || entry.index === index) &&
                                snapshot.ownership.includes(entry.code) !== enabled
                        );
                        if (!targets.length) {
                            notice.val = "Ownership is already set. No changes made.";
                            return false;
                        }
                        if (index === null) {
                            const cardifierNote = targets.some((entry) => entry.index === 50)
                                ? "\n\nThis includes 6 Star Cardifiers. Enabling grants no cardifiers and prevents the normal purchase. Disabling removes none. The normal purchase grants eight six-star cardifiers."
                                : "";
                            if (
                                !window.confirm(
                                    `${enabled ? "Enable" : "Disable"} ownership for ${targets.length} Eventshop upgrade${targets.length === 1 ? "" : "s"}?${cardifierNote}`
                                )
                            ) {
                                notice.val = "No changes made.";
                                return false;
                            }
                            const fresh = await readSnapshot();
                            applySnapshot(fresh);
                            if (
                                fresh.ownership !== snapshot.ownership ||
                                JSON.stringify(fresh.catalog) !== JSON.stringify(snapshot.catalog)
                            ) {
                                notice.val =
                                    "Catalog or ownership changed during confirmation. Review the refreshed state and try again.";
                                return false;
                            }
                        }

                        const targetCodes = new Set(targets.map((entry) => entry.code));
                        const nextOwnership = enabled
                            ? snapshot.ownership + targets.map((entry) => entry.code).join("")
                            : Array.from(snapshot.ownership)
                                  .filter((code) => !targetCodes.has(code))
                                  .join("");
                        attemptedWrite = true;
                        await writeVerified(OWNERSHIP_PATH, nextOwnership);
                        applySnapshot({ catalog: snapshot.catalog, ownership: nextOwnership });
                        notice.val = `Verified ownership for ${targets.length} upgrade${targets.length === 1 ? "" : "s"}.`;
                        return true;
                    } catch (caughtError) {
                        console.error("[Eventshop] ownership action failed", caughtError);
                        if (attemptedWrite) {
                            try {
                                applySnapshot(await readSnapshot());
                                notice.val =
                                    "The write could not be verified and may have applied. Current ownership was reread.";
                            } catch (readError) {
                                console.error("[Eventshop] read after write failure failed", readError);
                                ready.val = false;
                                error.val = `Ownership verification unavailable. Refresh before editing. ${readError.message}`;
                                notice.val = "The write may have applied. Ownership verification is unavailable.";
                            }
                        } else {
                            ready.val = false;
                            error.val = `Fresh read failed. Refresh before editing. ${caughtError.message}`;
                        }
                        throw caughtError;
                    }
                },
                {
                    successState: null,
                    onSuccess: (changed) => {
                        if (changed) feedback.status.val = "success";
                    },
                }
            );
        } finally {
            busy.val = false;
        }
    };

    load();
    return PersistentAccountListPage({
        title: "EVENTSHOP",
        description: "Edit account ownership without spending event points.",
        rootClass: "tab-container eventshop-tab",
        actions: BulkActionBar({
            actions: [
                {
                    label: "ENABLE ALL",
                    status: bulkEnable.status,
                    disabled: () => busy.val || !ready.val,
                    onClick: () => setOwnership(true, null, bulkEnable),
                },
                {
                    label: "DISABLE ALL",
                    status: bulkDisable.status,
                    variant: "danger",
                    disabled: () => busy.val || !ready.val,
                    onClick: () => setOwnership(false, null, bulkDisable),
                },
            ],
            refresh: { onClick: load, disabled: () => busy.val },
        }),
        wrapActions: false,
        state: { loading, error },
        body: div(
            { class: "scrollable-panel content-stack" },
            p(
                { class: "eventshop-note" },
                "Effects may require reopening the relevant game screen or reentering town. Disabling ownership does not undo rewards already received."
            ),
            p({ class: "eventshop-note write-status", role: "status", "aria-live": "polite" }, () => notice.val),
            listNode
        ),
    });
};
