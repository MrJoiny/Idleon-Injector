import van from "../../../../vendor/van-1.6.0.js";
import { gga, readComputed, readGgaEntries } from "../../../../services/api.js";
import { ClickerRow } from "../ClickerRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { getOrCreateState, writeVerified } from "../accountShared.js";

const { div } = van.tags;

const BUTTON_FIELDS = [
    { index: 594, label: "Presses Done", formatted: true },
    { index: 595, label: "Remaining Charges", formatted: true },
];

const ButtonRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        emptyBadge: "-",
    });

export const ButtonTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Button" });
    const fieldStates = new Map();

    const load = async () =>
        run(async () => {
            const results = await readGgaEntries(
                "OptionsListAccount",
                BUTTON_FIELDS.map((field) => String(field.index))
            );
            for (const field of BUTTON_FIELDS) {
                getOrCreateState(fieldStates, field.index).val = results[String(field.index)] ?? 0;
            }
        });

    const onWrite = async (index, value) => {
        await writeVerified(`OptionsListAccount[${index}]`, value, { write: gga });
        await readComputed("minehead", "Button_Bonuses", [0, -1]);
        return true;
    };

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "BUTTON",
            note: "OptionsListAccount[594] / [595]",
            body: div(
                { class: "account-item-stack" },
                ...BUTTON_FIELDS.map((field) =>
                    ButtonRow({ field, fieldState: getOrCreateState(fieldStates, field.index), onWrite })
                )
            ),
        })
    );

    load();

    return PersistentAccountListPage({
        title: "BUTTON",
        description: "Set W7 Button presses done and remaining charges from OptionsListAccount[594] and [595].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING BUTTON",
        errorTitle: "BUTTON READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
