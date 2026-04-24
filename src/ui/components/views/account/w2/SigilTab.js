/**
 * W2 - Sigils Tab (Alchemy)
 *
 * Data paths (within CauldronP2W[4]):
 *   [4][2*i + 1] -> tier for sigil i (-1=Locked .. 4=Eclectic)
 *   [4][2*i]     -> EXP for sigil i (not displayed; tier-only UI)
 *
 * Sigil names come from cList.SigilDesc[i][0].
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { ActionButton } from "../components/ActionButton.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { cleanName, runBulkSet, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span, select, option } = van.tags;

const SIGIL_TIERS = [
    { value: -1, label: "LOCKED", cls: "locked" },
    { value: 0, label: "UNLOCKED", cls: "unlocked" },
    { value: 1, label: "BOOSTED", cls: "boosted" },
    { value: 2, label: "IONIZED", cls: "ionized" },
    { value: 3, label: "ETHEREAL", cls: "ethereal" },
    { value: 4, label: "ECLECTIC", cls: "eclectic" },
];

const SIGIL_COUNT = 24;

const getTierInfo = (value) => SIGIL_TIERS.find((tier) => tier.value === Number(value)) ?? SIGIL_TIERS[0];

const SigilCard = ({ index, tierState, nameState }) => {
    const tierInput = van.state(String(tierState.val));
    const isFocused = van.state(false);
    const { status, run } = useWriteStatus();

    van.derive(() => {
        const nextValue = String(tierState.val);
        if (!isFocused.val && tierInput.val !== nextValue) {
            tierInput.val = nextValue;
        }
    });

    const doSet = async () => {
        const tier = Math.min(4, Math.max(-1, Math.round(Number(tierInput.val))));
        if (Number.isNaN(tier)) return;

        await run(async () => {
            const path = `CauldronP2W[4][${2 * index + 1}]`;
            await writeVerified(path, tier, { message: `Write mismatch at ${path}: expected ${tier}` });
            tierState.val = tier;
        });
    };

    return div(
        {
            class: () => {
                const tier = getTierInfo(tierState.val);
                return [
                    "tier-card",
                    `sigil-card--${tier.cls}`,
                    status.val === "success" ? "account-row--success" : "",
                    status.val === "error" ? "account-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" ");
            },
        },
        div(
            { class: "tier-card__header" },
            div(
                { class: "tier-card__identity" },
                span({ class: "tier-card__index" }, `#${index}`),
                span({ class: "tier-card__name" }, () => nameState.val)
            ),
            span(
                { class: () => `tier-card__badge sigil-tier-badge--${getTierInfo(tierState.val).cls}` },
                () => getTierInfo(tierState.val).label
            )
        ),
        select(
            {
                class: "tier-card__select select-base",
                onfocus: () => {
                    isFocused.val = true;
                },
                onblur: () => {
                    isFocused.val = false;
                    tierInput.val = String(tierState.val);
                },
                onchange: (e) => (tierInput.val = e.target.value),
            },
            ...SIGIL_TIERS.map((tier) =>
                option({ value: tier.value, selected: () => Number(tierInput.val) === tier.value }, tier.label)
            )
        ),
        ActionButton({
            label: "SET",
            status,
            className: "tier-card__set-btn",
            onClick: async (e) => {
                e.preventDefault();
                await doSet();
            },
        })
    );
};

export const SigilTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sigils" });
    const sigilTier = Array.from({ length: SIGIL_COUNT }, () => van.state(-1));
    const sigilName = Array.from({ length: SIGIL_COUNT }, (_, index) => van.state(`#${index}`));
    const setAllTier = van.state("-1");
    const { status: setAllStatus, run: runSetAll } = useWriteStatus();

    const load = async () =>
        run(async () => {
            const [rawP2W, rawSigilDesc] = await Promise.all([gga("CauldronP2W"), readCList("SigilDesc")]);
            const sigilData = toIndexedArray(toIndexedArray(rawP2W ?? [])[4] ?? []);
            const descArr = toIndexedArray(rawSigilDesc ?? []);

            for (let index = 0; index < SIGIL_COUNT; index++) {
                sigilTier[index].val = Number(sigilData[2 * index + 1] ?? -1);

                const entry = toIndexedArray(descArr[index] ?? []);
                sigilName[index].val = cleanName(entry[0], `#${index}`).toUpperCase();
            }
        });

    const doSetAll = async () => {
        const tier = Math.min(4, Math.max(-1, Math.round(Number(setAllTier.val))));
        if (Number.isNaN(tier)) return;

        await runSetAll(async () => {
            await runBulkSet({
                entries: sigilTier,
                getTargetValue: () => tier,
                getValueState: (tierState) => tierState,
                getPath: (_, index) => `CauldronP2W[4][${2 * index + 1}]`,
            });
        });
    };

    load();

    const setAllBar = div(
        { class: "tier-setall-bar" },
        span({ class: "tier-setall-bar__label" }, "SET ALL TIERS TO"),
        select(
            {
                class: "tier-setall-bar__select select-base",
                onchange: (e) => (setAllTier.val = e.target.value),
            },
            ...SIGIL_TIERS.map((tier) =>
                option({ value: tier.value, selected: () => Number(setAllTier.val) === tier.value }, tier.label)
            )
        ),
        ActionButton({
            label: "SET ALL",
            status: setAllStatus,
            onClick: async (e) => {
                e.preventDefault();
                await doSetAll();
            },
        })
    );

    const grid = div(
        { class: "tier-grid sigils-grid" },
        ...Array.from({ length: SIGIL_COUNT }, (_, index) =>
            SigilCard({ index, tierState: sigilTier[index], nameState: sigilName[index] })
        )
    );

    return AccountPageShell({
        header: AccountTabHeader({
            title: "ALCHEMY - SIGILS",
            description: "Manage tier and unlock status for all 24 alchemy sigils.",
            actions: RefreshButton({ onRefresh: load }),
        }),
        persistentState: { loading, error },
        body: div({ class: "tier-scroll scrollable-panel" }, setAllBar, grid),
    });
};
