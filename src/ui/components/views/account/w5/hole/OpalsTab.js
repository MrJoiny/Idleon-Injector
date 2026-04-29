import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toNum,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const OpalRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { formatted: true, min: 0, fallback: null }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

export const OpalsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Opals" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [holes, caves] = await Promise.all([gga("Holes"), readCList("HolesInfo[68]")]);
            const values = toIndexedArray(toIndexedArray(holes)[7]);
            const names = toIndexedArray(caves ?? []);
            entries.val = values
                .map((value, index) => {
                    const name = cleanName(names[index], "");
                    if (!name || name.toLowerCase() === "bruh") return null;
                    return {
                        key: `opal-${index}`,
                        index,
                        name,
                        path: `Holes[7][${index}]`,
                        value: toNum(value, 0),
                    };
                })
                .filter(Boolean);

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => OpalRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );
            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "OPALS",
        description: "Edit opals found per cavern from Holes[7].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE OPALS",
        errorTitle: "HOLE OPALS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "OPALS FOUND",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
