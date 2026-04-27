import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { ClickerRow } from "../ClickerRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanNameEffect } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div } = van.tags;

const PEARL_FIELD = { index: 454, label: "Pearls", live: true, formatted: true, float: true };
const CLAMWORKS_FIELDS = [
    { index: 455, label: "Pearl Value" },
    { index: 456, label: "Clam Comrades" },
    { index: 457, label: "Lucky Day" },
    { index: 458, label: "Multi-Scalping" },
    { index: 459, label: "Frugality" },
    { index: 460, label: "Pure Pearls" },
    { index: 461, label: "Encystation Up" },
    { index: 462, label: "Shinier Pearls" },
    { index: 463, label: "Anti Inflation" },
    { index: 464, label: "Worker Class" },
];
const ALL_FIELDS = [PEARL_FIELD, ...CLAMWORKS_FIELDS];

const ClamRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        emptyBadge: "-",
    });

export const ClamTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Clam" });
    const fieldStates = new Map(ALL_FIELDS.map((field) => [field.index, van.state(undefined)]));
    const descriptionState = van.state([]);

    const load = async () =>
        run(async () => {
            const [results, rawDescriptions] = await Promise.all([
                readGgaEntries(
                    "OptionsListAccount",
                    ALL_FIELDS.map((field) => String(field.index))
                ),
                readCList("Spelunky[27]"),
            ]);

            for (const field of ALL_FIELDS) {
                fieldStates.get(field.index).val = results[String(field.index)] ?? 0;
            }

            descriptionState.val = toIndexedArray(rawDescriptions ?? []).map((rawDescription) =>
                cleanNameEffect(rawDescription)
            );
        });

    const onWrite = async (index, value) => gga(`OptionsListAccount[${index}]`, value);

    const getClamworkField = (field, orderIndex) => ({
        ...field,
        description: descriptionState.val[orderIndex] || null,
    });

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "PEARLS",
            note: "OptionsListAccount[454]",
            body: div(
                { class: "account-item-stack" },
                ClamRow({
                    field: PEARL_FIELD,
                    fieldState: fieldStates.get(PEARL_FIELD.index),
                    onWrite,
                })
            ),
        }),
        AccountSection({
            title: "CLAMWORKS",
            note: () => `${CLAMWORKS_FIELDS.length} UPGRADES`,
            body: () =>
                div(
                    { class: "account-item-stack" },
                    ...CLAMWORKS_FIELDS.map((field, index) =>
                        ClamRow({
                            field: getClamworkField(field, index),
                            fieldState: fieldStates.get(field.index),
                            onWrite,
                        })
                    )
                ),
        })
    );

    load();

    return PersistentAccountListPage({
        title: "CLAM",
        description: "Set W7 Clam pearl amount and Clamworks upgrade levels from OptionsListAccount.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING CLAM",
        errorTitle: "CLAM READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
