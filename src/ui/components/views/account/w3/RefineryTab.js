/**
 * W3 - Refinery Tab
 *
 * Data sources:
 *   gga.Refinery[3..11][0]                    - current charge (salt stored)
 *   gga.Refinery[3..11][1]                    - level
 *   gga.ItemDefinitionsGET.h.Refinery1..9.h.displayName - refinery names
 *
 * Notes:
 *   - Refineries 7-9 require the "Polymer Refinery" research to be unlocked in-game.
 *   - Refinery 9 (gga.Refinery[11]) is a placeholder and has no in-game effect yet.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { Icons } from "../../../../assets/icons.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { NoticeBanner, RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanName, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const REFINERY_COUNT = 9;
const REFINERY_OFFSET = 3;
const POLYMER_LOCK_FROM = 6;
const PLACEHOLDER_INDEX = 8;

const RefineryValueRow = ({ label, badgePrefix, fieldIndex, gameIndex, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const nextValue = Math.max(0, Math.round(Number(rawValue)));
            return Number.isNaN(nextValue) ? null : nextValue;
        },
        write: async (nextValue) => {
            const path = `Refinery[${gameIndex}][${fieldIndex}]`;
            await writeVerified(path, nextValue, {
                message: `Write mismatch at ${path}: expected ${nextValue}, got failed verification`,
            });
            return nextValue;
        },
        renderInfo: () => span({ class: "account-row__name" }, label),
        renderBadge: (currentValue) => `${badgePrefix} ${currentValue ?? 0}`,
        controlsClass: "account-row__controls--xl",
    });

const RefinerySection = ({ refIndex, name, levelState, chargeState }) => {
    const gameIndex = refIndex + REFINERY_OFFSET;
    const isPolymer = refIndex >= POLYMER_LOCK_FROM;
    const isPlaceholder = refIndex === PLACEHOLDER_INDEX;
    const badges = [
        isPolymer ? span({ class: "refinery-badge refinery-badge--polymer" }, Icons.Wrench(), " POLYMER") : null,
        isPlaceholder
            ? span({ class: "refinery-badge refinery-badge--placeholder" }, Icons.Warning(), " NOT IN GAME")
            : null,
    ].filter(Boolean);

    return AccountSection({
        title: typeof name === "function" ? () => `#${refIndex + 1} ${name()}` : `#${refIndex + 1} ${name}`,
        meta: badges.length ? div({ class: "refinery-section__badges" }, ...badges) : null,
        rootClass: [
            "refinery-section",
            isPolymer ? "refinery-section--polymer" : "",
            isPlaceholder ? "refinery-section--placeholder" : "",
        ]
            .filter(Boolean)
            .join(" "),
        body: [
            RefineryValueRow({
                label: "LEVEL",
                badgePrefix: "LV",
                fieldIndex: 1,
                gameIndex,
                valueState: levelState,
            }),
            RefineryValueRow({
                label: "CHARGE",
                badgePrefix: "CHARGE",
                fieldIndex: 0,
                gameIndex,
                valueState: chargeState,
            }),
        ],
    });
};

export const RefineryTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Refinery" });
    const nameStates = Array.from({ length: REFINERY_COUNT }, (_, i) => van.state(`Refinery ${i + 1}`));
    const levelStates = Array.from({ length: REFINERY_COUNT }, () => van.state(0));
    const chargeStates = Array.from({ length: REFINERY_COUNT }, () => van.state(0));
    const sectionsPerColumn = Math.ceil(REFINERY_COUNT / 3);
    const grid = div(
        { class: "refinery-grid grid-3col" },
        ...Array.from({ length: 3 }, (_, columnIndex) =>
            div(
                { class: "refinery-col" },
                ...Array.from({ length: sectionsPerColumn }, (_, offset) => {
                    const index = columnIndex * sectionsPerColumn + offset;
                    if (index >= REFINERY_COUNT) return null;
                    return RefinerySection({
                        refIndex: index,
                        name: () => nameStates[index].val,
                        levelState: levelStates[index],
                        chargeState: chargeStates[index],
                    });
                }).filter(Boolean)
            )
        )
    );
    const body = div({ class: "scrollable-panel" }, grid);

    const load = async () =>
        run(async () => {
            const refineryKeys = Array.from({ length: REFINERY_COUNT }, (_, i) => `Refinery${i + 1}`);
            const [raw, nameEntries] = await Promise.all([
                gga("Refinery"),
                readGgaEntries("ItemDefinitionsGET.h", refineryKeys, ["displayName"]),
            ]);

            const names = refineryKeys.map((key, i) => {
                const entry = nameEntries[key];
                return cleanName(entry?.displayName, `Refinery ${i + 1}`);
            });

            for (let i = 0; i < REFINERY_COUNT; i++) {
                nameStates[i].val = names[i];
                const entry = (raw ?? [])[i + REFINERY_OFFSET] ?? [];
                chargeStates[i].val = Number(entry[0] ?? 0);
                levelStates[i].val = Number(entry[1] ?? 0);
            }
        });

    load();

    return PersistentAccountListPage({
        title: "W3 - REFINERY",
        description: "Set refinery levels and salt charges.",
        actions: RefreshButton({ onRefresh: load }),
        topNotices: [
            NoticeBanner(
                { icon: Icons.Wrench(), variant: "polymer" },
                span(
                    {},
                    "Refineries 7-9 require the ",
                    span({ class: "warning-banner__highlight" }, "Polymer Refinery"),
                    " research to be unlocked in-game before they are available."
                )
            ),
            WarningBanner(
                span(
                    {},
                    "Refinery 9 is a ",
                    span({ class: "warning-banner__highlight" }, "placeholder"),
                    " - it does not exist in the game yet and setting it has no effect."
                )
            ),
        ],
        state: { loading, error },
        loadingText: "READING REFINERY",
        errorTitle: "REFINERY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
