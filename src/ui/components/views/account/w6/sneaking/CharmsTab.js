import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import {
    cleanName,
    cleanNameEffect,
    createStaticRowReconciler,
    getOrCreateState,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, input, label, span } = van.tags;

const CHARM_UNLOCK_PATH = "Ninja[107]";
const CHARM_COUNT = 23;

const CharmRow = ({ entry, unlockedState }) => {
    const { status, run } = useWriteStatus();

    const writeToggle = async (enabled) => {
        await run(async () => {
            const nextValue = enabled ? 1 : 0;
            await writeVerified(`${CHARM_UNLOCK_PATH}[${entry.index}]`, nextValue);
            unlockedState.val = nextValue;
        });
    };

    return AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, entry.effect)
            ),
        ],
        badge: () => (unlockedState.val ? "UNLOCKED" : "LOCKED"),
        rowClass: () =>
            unlockedState.val ? "sneaking-toggle-row sneaking-toggle-row--enabled" : "sneaking-toggle-row",
        status,
        controls: label(
            { class: "toggle-switch", title: "Toggle charm unlock" },
            input({
                type: "checkbox",
                checked: () => Boolean(unlockedState.val),
                disabled: () => status.val === "loading",
                onchange: (e) => void writeToggle(e.target.checked),
            }),
            span({ class: "slider" })
        ),
    });
};

const buildCharmEntries = (rawUnlocks, rawCharmRecords) => {
    const unlocks = toIndexedArray(rawUnlocks ?? []);
    return rawCharmRecords.map((rawRecord, index) => {
        const record = toIndexedArray(rawRecord ?? []);
        return {
            index,
            rawName: String(record[2] ?? `Charm_${index}`).trim(),
            name: cleanName(record[2], `Charm ${index + 1}`),
            effect: cleanNameEffect(record[5], "No effect text"),
            unlocked: Number(unlocks[index] ?? 0) ? 1 : 0,
        };
    });
};

export const CharmsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sneaking Charms" });
    const entries = van.state([]);
    const unlockedStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawUnlocks, rawCharmRecords] = await Promise.all([
                gga(CHARM_UNLOCK_PATH),
                Promise.all(
                    Array.from({ length: CHARM_COUNT }, (_, index) => gga(`CustomMaps.h.NjEQ.h.NjTrP${index}`))
                ),
            ]);

            entries.val = buildCharmEntries(rawUnlocks, rawCharmRecords);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    CharmRow({
                        entry,
                        unlockedState: getOrCreateState(unlockedStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(unlockedStates, entry.index).val = entry.unlocked;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "PRISTINE CHARMS",
            note: () =>
                `${entries.val.filter((entry) => getOrCreateState(unlockedStates, entry.index).val).length} / ${
                    entries.val.length
                } UNLOCKED`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "CHARMS",
        description: "Toggle Pristine Charm unlocks from Ninja[107]. Names come from NjTrP0 through NjTrP22.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SNEAKING CHARMS",
        errorTitle: "SNEAKING CHARMS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
