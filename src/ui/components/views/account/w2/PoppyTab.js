/**
 * W2 - Poppy Tab
 *
 * Reads/writes selected OptionsListAccount indices for Poppy and Tar Pit.
 *
 * Notes:
 * - Built in the same style as Orion (per-row write status + persistent list).
 * - Tar Pit and Spiral Upgrades are explicitly separated with section dividers.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClickerRow } from "../ClickerRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";

const { div, span } = van.tags;

const PINNED_FIELDS = [
    { index: 271, label: "Poppy Permanent Bonus Level" },
    { index: 274, label: "Fisheroo Reset Level" },
    { index: 279, label: "Greatest Catch / Megafish Progression" },
];

const CORE_FIELDS = [
    { index: 267, label: "Bluefin Fish Owned", live: true, formatted: true },
    { index: 268, label: "Tasty Fishbait Level" },
    { index: 269, label: "Quick Reeling Level" },
    { index: 270, label: "Shiny Lure Level" },
    { index: 272, label: "Fishy Discount Level" },
    { index: 273, label: "Juicy Worm Level" },
    { index: 275, label: "Fishing Buddy Level" },
    { index: 276, label: "Lightning Quickness Level" },
    { index: 277, label: "Fisheroo Investing Level" },
    { index: 278, label: "Multihook Fishing Level" },
    { index: 280, label: "Lifetime Bluefin Caught", live: true, formatted: true },
    { index: 281, label: "Shiny/Fish Counter 1", formatted: true },
    { index: 282, label: "Shiny/Fish Counter 2", formatted: true },
    { index: 283, label: "Shiny/Fish Counter 3", formatted: true },
    { index: 284, label: "Shiny/Fish Counter 4", formatted: true },
    { index: 285, label: "Shiny/Fish Counter 5", formatted: true },
    { index: 286, label: "Shiny/Fish Counter 6", formatted: true },
    { index: 289, label: "Shiny Progress Bar", float: true },
];

const SPIRAL_FIELDS = [
    { index: 290, label: "Reset Points", formatted: true },
    { index: 291, label: "Reset Spiral Upgrade 1" },
    { index: 292, label: "Reset Spiral Upgrade 2" },
    { index: 293, label: "Reset Spiral Upgrade 3" },
    { index: 294, label: "Reset Spiral Upgrade 4" },
    { index: 295, label: "Reset Spiral Upgrade 5" },
];

const TAR_PIT_FIELDS = [
    { index: 296, label: "Tartar Fish Owned", live: true, formatted: true },
    { index: 297, label: "Tar Pit Upgrade 1: Super Yummy Bait" },
    { index: 298, label: "Tar Pit Upgrade 2: Bonus Catching" },
    { index: 299, label: "Tar Pit Upgrade 3: Bluefin Frenzy" },
    { index: 300, label: "Tar Pit Upgrade 4: Fishy Reductions" },
    { index: 301, label: "Tar Pit Upgrade 5: Super Tarbait" },
    { index: 302, label: "Tar Pit Upgrade 6: Tarrific Resets" },
    { index: 303, label: "Tar Pit Upgrade 7: Mongo Multipliers" },
    { index: 304, label: "Tar Pit Upgrade 8: King Worm" },
];

const ALL_FIELDS = [...PINNED_FIELDS, ...CORE_FIELDS, ...SPIRAL_FIELDS, ...TAR_PIT_FIELDS];

const PoppyRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        controlsClass: "account-row__controls--xl",
        emptyBadge: "-",
        getWriteMismatchMessage: (index, nextValue) =>
            `Write mismatch at OptionsListAccount[${index}]: expected ${nextValue}`,
    });

export const PoppyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Poppy" });

    const fieldStates = new Map(ALL_FIELDS.map((f) => [f.index, van.state(undefined)]));
    const load = async () =>
        run(async () => {
            const keys = ALL_FIELDS.map((f) => String(f.index));
            const results = await readGgaEntries("OptionsListAccount", keys);
            for (const f of ALL_FIELDS) {
                fieldStates.get(f.index).val = results[String(f.index)] ?? 0;
            }
        });

    const onWrite = async (index, value) => {
        return gga(`OptionsListAccount[${index}]`, value);
    };

    const rowList = div(
        { class: "account-list poppy-list" },
        AccountSection({
            title: "PERMANENT / SENSITIVE",
            note: "Edit with care",
            body: PINNED_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        }),
        AccountSection({
            title: "MAIN POPPY PROGRESS",
            body: CORE_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        }),
        AccountSection({
            title: "SPIRAL UPGRADES",
            rootClass: "poppy-section poppy-section--spiral",
            body: SPIRAL_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        }),
        AccountSection({
            title: "TAR PIT",
            rootClass: "poppy-section poppy-section--tar",
            body: TAR_PIT_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        })
    );

    load();

    return AccountPageShell({
        rootClass: "poppy-tab tab-container",
        header: AccountTabHeader({
            title: "POPPY",
            description: "Poppy clicker values and Tar Pit progression controls",
            actions: RefreshButton({
                onRefresh: load,
                tooltip: "Re-read Poppy data from game",
            }),
        }),
        topNotices: WarningBanner(
            " ",
            span({ class: "warning-highlight-accent" }, "Poppy Permanent Bonus"),
            " should stay around 70-90, and ",
            span({ class: "warning-highlight-accent" }, "Fisheroo Reset"),
            " should stay around 30-40. ",
            span({ class: "warning-highlight-accent" }, "Greatest Catch / Megafish"),
            " is also permanent progression."
        ),
        persistentState: { loading, error },
        persistentLoadingText: "READING POPPY",
        persistentErrorTitle: "POPPY READ FAILED",
        body: rowList,
    });
};
