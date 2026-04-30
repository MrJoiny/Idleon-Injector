import van from "../../../../vendor/van-1.6.0.js";
import { gga, readComputed, readGgaEntries } from "../../../../services/api.js";
import { ClickerRow } from "../ClickerRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { writeVerified } from "../accountShared.js";

const { div } = van.tags;

const BUTTON_FIELD = { index: 594, label: "Presses Done", formatted: true };

const ButtonRow = ({ fieldState, onWrite }) =>
    ClickerRow({
        field: BUTTON_FIELD,
        fieldState,
        onWrite,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        emptyBadge: "-",
    });

export const ButtonTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Button" });
    const fieldState = van.state(undefined);

    const load = async () =>
        run(async () => {
            const results = await readGgaEntries("OptionsListAccount", [String(BUTTON_FIELD.index)]);
            fieldState.val = results[String(BUTTON_FIELD.index)] ?? 0;
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
            note: "OptionsListAccount[594]",
            body: div({ class: "account-item-stack" }, ButtonRow({ fieldState, onWrite })),
        })
    );

    load();

    return PersistentAccountListPage({
        title: "BUTTON",
        description: "Set W7 Button presses done from OptionsListAccount[594].",
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
