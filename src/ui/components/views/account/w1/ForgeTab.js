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
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runPersistentAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { usePersistentPaneReady, writeVerified } from "../featureShared.js";
import { renderTabNav } from "../tabShared.js";

const { div, button, span } = van.tags;

const PAGES = [
    {
        id: 0,
        label: "PAGE 1",
        upgrades: [
            { label: "New Forge Slot", index: 0, max: 16 },
            { label: "Ore Capacity Boost", index: 1, max: 50 },
            { label: "Forge Speed", index: 2, max: 90 },
        ],
    },
    {
        id: 1,
        label: "PAGE 2",
        upgrades: [
            { label: "Forge EXP Gain", index: 3, max: 85 },
            { label: "Bar Bonanza", index: 4, max: 75 },
            { label: "Puff Puff Go", index: 5, max: 60 },
        ],
    },
];

const ForgeRow = ({ upgrade, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.min(upgrade.max, Math.max(0, Number(rawValue)));
            return Number.isNaN(lvl) ? null : lvl;
        },
        write: async (nextLevel) => {
            const path = `FurnaceLevels[${upgrade.index}]`;
            return writeVerified(path, nextLevel);
        },
        renderInfo: () => span({ class: "feature-row__name" }, upgrade.label),
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${upgrade.max}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.min(upgrade.max, Math.max(0, next + delta));
        },
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Set level (max ${upgrade.max})`),
        maxAction: {
            value: upgrade.max,
            tooltip: `Set to max level (${upgrade.max})`,
        },
    });

export const ForgeTab = () => {
    const activePage = van.state(0);
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const levelStates = Array.from({ length: 6 }, () => van.state(0));
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const load = async () =>
        runPersistentAccountLoad(
            {
                loading,
                error,
                refreshError,
                initialized,
                markReady,
                label: "Forge",
            },
            async () => {
            const raw = await gga("FurnaceLevels");
            const levels = toIndexedArray(raw);
            for (let i = 0; i < levelStates.length; i++) {
                levelStates[i].val = Number(levels[i] ?? 0);
            }
        }
        );

    load();

    const rowList = div({ class: () => paneClass("feature-list") }, () => {
        const page = PAGES[activePage.val];
        return div(
            { class: "forge-upgrades-list" },
            ...page.upgrades.map((upgrade) =>
                ForgeRow({
                    upgrade,
                    levelState: levelStates[upgrade.index],
                })
            )
        );
    });
    return AccountPageShell({
        rootClass: "world-feature scroll-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "FORGE",
            description: "Set forge upgrade levels — each upgrade has a hard maximum",
            actions: withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read forge levels from game memory"
            ),
        }),
        subNav: renderTabNav({
            tabs: PAGES,
            activeId: activePage,
            navClass: "feature-page-nav",
            buttonClass: "feature-page-btn",
        }),
        persistentState: { loading, error, refreshError, initialized },
        persistentLoadingText: "READING FORGE",
        persistentErrorTitle: "FORGE READ FAILED",
        persistentInitialWrapperClass: "feature-list",
        body: rowList,
    });
};
