import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { toInt } from "../accountShared.js";

const { div } = van.tags;

const RIFTS_UNLOCKED_PATH = "Rift[0]";

export const RiftTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Rift" });
    const riftsUnlockedState = van.state(0);

    const load = async () =>
        run(async () => {
            riftsUnlockedState.val = toInt(await gga(RIFTS_UNLOCKED_PATH), { min: 0 });
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "RIFTS",
            note: "Rift[0]",
            body: div(
                { class: "account-item-stack" },
                SimpleNumberRow({
                    entry: {
                        index: 0,
                        name: "Rifts Unlocked",
                        path: RIFTS_UNLOCKED_PATH,
                        formatted: false,
                        badge: (currentValue) => `${currentValue ?? 0} UNLOCKED`,
                    },
                    valueState: riftsUnlockedState,
                })
            ),
        })
    );

    return PersistentAccountListPage({
        title: "RIFT",
        description: "Edit W4 Rift unlock progress.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING RIFT",
        errorTitle: "RIFT READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
