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
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { RefreshErrorBanner, usePersistentPaneReady } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

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
            const ok = await gga(path, nextLevel);
            if (!ok) throw new Error(`Write mismatch at ${path}`);
            return nextLevel;
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

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const raw = await gga("FurnaceLevels");
            const levels = toIndexedArray(raw);
            for (let i = 0; i < levelStates.length; i++) {
                levelStates[i].val = Number(levels[i] ?? 0);
            }
            markReady();
        } catch (e) {
            const message = e.message || "Failed to read forge data";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

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
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    return div(
        { class: "world-feature scroll-container" },
        div(
            { class: "feature-header" },
            div(
                null,
                h3("FORGE"),
                p({ class: "feature-header__desc" }, "Set forge upgrade levels — each upgrade has a hard maximum")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read forge levels from game memory"
            )
        ),
        div(
            { class: "feature-page-nav" },
            ...PAGES.map((pg) =>
                button(
                    {
                        class: () => `feature-page-btn ${activePage.val === pg.id ? "active" : ""}`,
                        onclick: () => (activePage.val = pg.id),
                    },
                    pg.label
                )
            )
        ),
        renderRefreshErrorBanner,
        () =>
            loading.val && !initialized.val
                ? div({ class: "feature-list" }, div({ class: "feature-loader" }, Loader({ text: "READING FORGE" })))
                : null,
        () =>
            !loading.val && error.val && !initialized.val
                ? div(
                      { class: "feature-list" },
                      EmptyState({ icon: Icons.SearchX(), title: "FORGE READ FAILED", subtitle: error.val })
                  )
                : null,
        rowList
    );
};
