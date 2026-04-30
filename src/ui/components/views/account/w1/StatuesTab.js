/**
 * W1 - Statues Tab
 *
 * Data sources:
 *   cList.StatueInfo[i]  -> [name, bonusDesc, ...]
 *   gga.StatueLevels[i]  -> [level, deposited]
 *   gga.StatueG[i]       -> tier: 0=Stone, 1=Gold, 2=Onyx, 3=Zenith
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableFieldsRow, StackedNumberField } from "../EditableFieldsRow.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    createStaticRowReconciler,
    getOrCreateState,
    resolveFormattedIntInput,
    toInt,
    writeVerified,
} from "../accountShared.js";

const { div, span, select, option } = van.tags;

const TIERS = [
    { value: 0, label: "Stone" },
    { value: 1, label: "Gold" },
    { value: 2, label: "Onyx" },
    { value: 3, label: "Zenith" },
];

const TIER_ROW_CLASSES = ["", "tier--gold", "tier--onyx", "tier--zenith"];
const TIER_BADGE_CLASSES = ["stone", "gold", "onyx", "zenith"];

const StatueRow = ({ index, nameState, levelState, depositedState, tierState }) =>
    EditableFieldsRow({
        fields: [
            {
                key: "level",
                label: "Level",
                valueState: levelState,
                rootClass: "statue-control-row",
                labelClass: "statue-control-label",
            },
            {
                key: "deposited",
                label: "Deposited",
                valueState: depositedState,
                formatted: true,
                rootClass: "statue-control-row",
                labelClass: "statue-control-label",
            },
            { key: "tier", valueState: tierState, toDraft: (value) => toInt(value, { min: 0 }) },
        ],
        normalize: ({ level, deposited, tier }) => {
            const rawLevel = Number(level);
            const nextDeposited = resolveFormattedIntInput(deposited, null, { min: 0 });
            if (Number.isNaN(rawLevel) || nextDeposited === null) return null;

            return {
                level: toInt(rawLevel, { min: 0 }),
                deposited: nextDeposited,
                tier: Math.min(TIERS.length - 1, toInt(tier, { min: 0 })),
            };
        },
        write: async ({ level, deposited, tier }) => {
            await writeVerified(`StatueLevels[${index}][0]`, level);
            await writeVerified(`StatueLevels[${index}][1]`, deposited);
            await writeVerified(`StatueG[${index}]`, tier);
            return { level, deposited, tier };
        },
        rowClass: () => TIER_ROW_CLASSES[tierState.val] ?? "",
        info: [
            span({ class: "account-row__name" }, () => nameState.val),
            span(
                {
                    class: () => `statue-tier-badge tier--${TIER_BADGE_CLASSES[tierState.val] ?? "stone"}`,
                },
                () => TIERS[tierState.val]?.label ?? "Stone"
            ),
        ],
        badge: () => `LV ${levelState.val}`,
        renderControls: ({ draftStates, getDraftValue, resetDraft, setFieldFocused, status }) =>
            div(
                { class: "account-row__controls--stack" },
                StackedNumberField({
                    field: {
                        key: "level",
                        label: "Level",
                        rootClass: "statue-control-row",
                        labelClass: "statue-control-label",
                    },
                    draftStates,
                    getDraftValue,
                    setFieldFocused,
                    resetDraft,
                }),
                StackedNumberField({
                    field: {
                        key: "deposited",
                        label: "Deposited",
                        formatted: true,
                        rootClass: "statue-control-row",
                        labelClass: "statue-control-label",
                    },
                    draftStates,
                    getDraftValue,
                    setFieldFocused,
                    resetDraft,
                }),
                div(
                    { class: "statue-control-row" },
                    span({ class: "statue-control-label" }, "Tier"),
                    select(
                        {
                            class: "statue-tier-select select-base",
                            onchange: (e) => (draftStates.tier.val = Number(e.target.value)),
                            disabled: () => status.val === "loading",
                        },
                        ...TIERS.map((tier) =>
                            option(
                                {
                                    value: tier.value,
                                    selected: () => draftStates.tier.val === tier.value,
                                },
                                tier.label
                            )
                        )
                    )
                )
            ),
        applyTooltip: "Write level, deposited, and tier to game",
    });

export const StatuesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Statues" });

    const nameStates = new Map();
    const levelStates = new Map();
    const depositedStates = new Map();
    const tierStates = new Map();

    const listNode = div({ class: "account-list" });
    const reconcileStatueRows = createStaticRowReconciler(listNode);

    const reconcileRows = (info) => {
        const statues = (info ?? [])
            .map((entry, index) => ({ index, name: entry?.[0] }))
            .filter((statue) => statue.name && statue.name.trim().length > 0);

        reconcileStatueRows(statues.map((statue) => statue.index).join(","), () => {
            return statues.map((statue) =>
                StatueRow({
                    index: statue.index,
                    nameState: getOrCreateState(nameStates, statue.index, statue.name),
                    levelState: getOrCreateState(levelStates, statue.index),
                    depositedState: getOrCreateState(depositedStates, statue.index),
                    tierState: getOrCreateState(tierStates, statue.index),
                })
            );
        });
    };

    const load = async () =>
        run(async () => {
            const [rawInfo, rawLevels, rawTiers] = await Promise.all([
                readCList("StatueInfo"),
                gga("StatueLevels"),
                gga("StatueG"),
            ]);
            const info = toIndexedArray(rawInfo);
            const levels = toIndexedArray(rawLevels);
            const tiers = toIndexedArray(rawTiers);

            info.forEach((entry, i) => {
                if (!entry?.[0] || !entry[0].trim()) return;

                getOrCreateState(nameStates, i, entry[0]).val = entry[0];
                getOrCreateState(levelStates, i).val = toInt(levels?.[i]?.[0]);
                getOrCreateState(depositedStates, i).val = toInt(levels?.[i]?.[1]);
                getOrCreateState(tierStates, i).val = Math.min(TIERS.length - 1, toInt(tiers?.[i], { min: 0 }));
            });

            reconcileRows(info);
        });

    load();

    return PersistentAccountListPage({
        rootClass: "tab-container scroll-container",
        title: "STATUES",
        description: "Set statue levels, deposited amounts, and upgrade tiers",
        actions: RefreshButton({
            onRefresh: load,
            tooltip: "Re-read statue data from game memory",
        }),
        topNotices: WarningBanner(
            " Tier upgrades require specific tools: ",
            span({ class: "warning-highlight-accent" }, "Guilding Tools"),
            " for Gold, ",
            span({ class: "warning-highlight-onyx" }, "Onyx Tools"),
            " for Onyx, ",
            span({ class: "warning-highlight-zenith" }, "Zenith Tools"),
            " for Zenith. Note that this is only visual to the StatueMan in W1; when set to any rarity it will give their full bonus"
        ),
        state: { loading, error },
        loadingText: "READING STATUES",
        errorTitle: "STATUES READ FAILED",
        initialWrapperClass: "account-list",
        body: listNode,
    });
};
