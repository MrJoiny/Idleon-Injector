/**
 * W1 - Forge Tab
 *
 * FurnaceLevels layout (indices 0-5, index 6 = XP progress, ignored):
 *   Page 1:
 *     [0] New Forge Slot      - max 16
 *     [1] Ore Capacity Boost  - max 50
 *     [2] Forge Speed         - max 90
 *   Page 2:
 *     [3] Forge EXP Gain      - max 85
 *     [4] Bar Bonanza         - max 75
 *     [5] Puff Puff Go        - max 60
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { AccountSection } from "../components/AccountSection.js";
import { runBulkSet, useWriteStatus } from "../accountShared.js";

const { div } = van.tags;

const SECTIONS = [
    {
        label: "Page 1",
        upgrades: [
            { label: "New Forge Slot", index: 0, max: 16 },
            { label: "Ore Capacity Boost", index: 1, max: 50 },
            { label: "Forge Speed", index: 2, max: 90 },
        ],
    },
    {
        label: "Page 2",
        upgrades: [
            { label: "Forge EXP Gain", index: 3, max: 85 },
            { label: "Bar Bonanza", index: 4, max: 75 },
            { label: "Puff Puff Go", index: 5, max: 60 },
        ],
    },
];
const FORGE_UPGRADES = SECTIONS.flatMap((section) => section.upgrades);

const ForgeRow = ({ upgrade, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `FurnaceLevels[${upgrade.index}]`,
        max: upgrade.max,
        name: upgrade.label,
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Set level (max ${upgrade.max})`),
        maxAction: true,
    });

export const ForgeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Forge" });
    const { status: maxAllStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: 6 }, () => van.state(0));

    const load = async () =>
        run(async () => {
            const raw = await gga("FurnaceLevels");
            const levels = toIndexedArray(raw);
            for (let i = 0; i < levelStates.length; i++) {
                levelStates[i].val = Number(levels[i] ?? 0);
            }
        });

    const doMaxAll = async () => {
        await runMaxAll(async () => {
            await runBulkSet({
                entries: FORGE_UPGRADES,
                getTargetValue: (upgrade) => upgrade.max,
                getValueState: (upgrade) => levelStates[upgrade.index],
                getPath: (upgrade) => `FurnaceLevels[${upgrade.index}]`,
            });
        });
    };

    load();

    const body = div(
        { class: "account-list" },
        ...SECTIONS.map((section) =>
            AccountSection({
                title: section.label,
                rootClass: "forge-upgrades-list",
                body: section.upgrades.map((upgrade) =>
                    ForgeRow({
                        upgrade,
                        levelState: levelStates[upgrade.index],
                    })
                ),
            })
        )
    );
    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "FORGE",
            description: "Set forge upgrade levels — each upgrade has a hard maximum",
            wrapActions: false,
            actions: BulkActionBar({
                actions: [
                    {
                        label: "MAX ALL",
                        status: maxAllStatus,
                        tooltip: "Set all forge upgrades to their max levels",
                        onClick: doMaxAll,
                    },
                ],
                refresh: {
                    onClick: load,
                    tooltip: "Re-read forge levels from game memory",
                },
            }),
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING FORGE",
        persistentErrorTitle: "FORGE READ FAILED",
        persistentInitialWrapperClass: "account-list",
        body,
    });
};
