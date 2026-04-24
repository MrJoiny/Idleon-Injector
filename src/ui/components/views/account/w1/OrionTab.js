/**
 * W1 - Orion Tab
 *
 * Reads/writes OptionsListAccount indices 253-264.
 *
 * Index map:
 *   253 - Feathers (current count)
 *   254 - Feather Generation (upgrade level)
 *   255 - Bonuses of Orion
 *   256 - Feather Multiplier
 *   257 - Feather Cheapener
 *   258 - Feather Restart
 *   259 - Super Feather Production
 *   260 - Shiny Feathers
 *   261 - Super Feather Cheapener
 *   262 - The Great Mega Reset
 *   263 - Filler Bar (float, bar-fill progress 0-1)
 *   264 - Shiny Feathers (count)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClickerRow } from "../ClickerRow.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountSection } from "../components/AccountSection.js";

const { div, span } = van.tags;

const PINNED = [
    { index: 255, label: "Bonuses of Orion" },
    { index: 258, label: "Feather Restart" },
    { index: 262, label: "The Great Mega Reset" },
];

const FIELDS = [
    { index: 253, label: "Feathers", live: true, formatted: true },
    { index: 254, label: "Feather Generation" },
    { index: 256, label: "Feather Multiplier" },
    { index: 257, label: "Feather Cheapener" },
    { index: 259, label: "Super Feather Production" },
    { index: 260, label: "Shiny Feathers" },
    { index: 261, label: "Super Feather Cheapener" },
    { index: 263, label: "Filler Bar", float: true },
    { index: 264, label: "Shiny Feathers (count)" },
];

const ALL_FIELDS = [...PINNED, ...FIELDS];

const OrionRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        controlsClass: "account-row__controls--xl",
    });

export const OrionTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Orion" });

    const fieldStates = new Map(ALL_FIELDS.map((field) => [field.index, van.state(undefined)]));

    const load = async () =>
        run(async () => {
            const keys = ALL_FIELDS.map((field) => String(field.index));
            const results = await readGgaEntries("OptionsListAccount", keys);
            for (const field of ALL_FIELDS) {
                fieldStates.get(field.index).val = results[String(field.index)] ?? 0;
            }
        });

    const onWrite = async (index, value) => {
        return await gga(`OptionsListAccount[${index}]`, value);
    };

    const rowList = div(
        { class: "account-list" },
        AccountSection({
            title: "PERMANENT BONUSES",
            note: "Edit with care",
            body: PINNED.map((field) => OrionRow({ field, fieldState: fieldStates.get(field.index), onWrite })),
        }),
        AccountSection({
            title: "UPGRADES & STATS",
            body: FIELDS.map((field) => OrionRow({ field, fieldState: fieldStates.get(field.index), onWrite })),
        })
    );

    load();

    return PersistentAccountListPage({
        rootClass: "tab-container scroll-container",
        title: "ORION",
        description: "Manage Orion the Great Horned Owl - loads once, refreshes after each set",
        actions: RefreshButton({
            onRefresh: load,
            tooltip: "Re-read Orion data from game",
        }),
        topNotices: WarningBanner(
            " ",
            span({ class: "warning-highlight-accent" }, "Bonuses of Orion"),
            " and ",
            span({ class: "warning-highlight-accent" }, "The Great Mega Reset"),
            " are permanent - keep values between 70-90. ",
            span({ class: "warning-highlight-accent" }, "Feather Restart"),
            " is permanent - keep between 30-40."
        ),
        state: { loading, error },
        loadingText: "READING ORION",
        errorTitle: "ORION READ FAILED",
        initialWrapperClass: "account-list",
        body: rowList,
    });
};
