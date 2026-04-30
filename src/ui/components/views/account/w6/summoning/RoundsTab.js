import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, input, label, span } = van.tags;

const NORMAL_ROUNDS_PATH = "Summon[1]";
const ENDLESS_ROUNDS_PATH = "OptionsListAccount[319]";
const ROUND_ORDER_COLUMN = 8;
const ROUND_SECTIONS = [
    { name: "White", size: 9 },
    { name: "Green", size: 15 },
    { name: "Yellow", size: 11 },
    { name: "Blue", size: 14 },
    { name: "Purple", size: 13 },
    { name: "Red", size: 13 },
    { name: "Cyan", size: 14 },
    { name: "Teal", size: 18 },
];
const COMPLETION_ALIASES = {
    poopD: ["poopD", "poopSmall"],
};
const COUNT_IGNORED_COMPLETIONS = new Set(["mini4a"]);

const toggleRoundId = (ids, id, enabled) => {
    const currentIds = toIndexedArray(ids ?? []);
    const existing = new Set(currentIds);
    if (enabled) return existing.has(id) ? currentIds : [...currentIds, id];
    return currentIds.filter((entry) => entry !== id);
};

const RoundRow = ({ entry, doneState, completedIdsState }) => {
    const { status, run } = useWriteStatus();

    const writeToggle = async (enabled) => {
        await run(async () => {
            const nextIds = toggleRoundId(completedIdsState.val, entry.enemyId, enabled);
            await writeVerified(NORMAL_ROUNDS_PATH, nextIds);
            completedIdsState.val = nextIds;
            doneState.val = enabled ? 1 : 0;
        });
    };

    return AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.roundOrder}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, entry.enemyId)
            ),
        ],
        badge: () => (doneState.val ? "DONE" : "OPEN"),
        rowClass: () => (doneState.val ? "summoning-round-row summoning-round-row--done" : "summoning-round-row"),
        status,
        controls: label(
            { class: "toggle-switch", title: "Toggle normal round completion" },
            input({
                type: "checkbox",
                checked: () => Boolean(doneState.val),
                disabled: () => status.val === "loading",
                onchange: (e) => void writeToggle(e.target.checked),
            }),
            span({ class: "slider" })
        ),
    });
};

const EndlessRoundRow = ({ valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextValue) => writeVerified(ENDLESS_ROUNDS_PATH, nextValue),
        renderInfo: () => span({ class: "account-row__name" }, "Endless Rounds Done"),
        renderBadge: (currentValue) => `ROUND ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const isRoundDone = (enemyId, completedIds) =>
    (COMPLETION_ALIASES[enemyId] ?? [enemyId]).some((completionId) => completedIds.has(completionId));

const buildRoundEntries = (rawRoundData, rawCompletedIds) => {
    const ids = toIndexedArray(rawRoundData?.[0] ?? []);
    const names = toIndexedArray(rawRoundData?.[4] ?? []);
    const roundOrders = toIndexedArray(rawRoundData?.[ROUND_ORDER_COLUMN] ?? []);
    const completedIds = new Set(toIndexedArray(rawCompletedIds ?? []));
    const roundRows = ids
        .map((enemyId, index) => {
            const roundOrder = Number(roundOrders[index]);
            return {
                index,
                enemyId,
                roundOrder,
                rawName: String(names[index] ?? "").trim(),
            };
        })
        .filter((entry) => entry.enemyId && entry.rawName && entry.rawName !== "_" && Number.isFinite(entry.roundOrder))
        .sort((a, b) => a.roundOrder - b.roundOrder || a.index - b.index);

    let offset = 0;

    return ROUND_SECTIONS.flatMap((section) => {
        const sectionRows = roundRows.slice(offset, offset + section.size);
        offset += section.size;

        return sectionRows.map((entry) => {
            return {
                ...entry,
                name: cleanName(entry.rawName, `Round ${entry.index + 1}`),
                sectionName: section.name,
                countAsDone: !COUNT_IGNORED_COMPLETIONS.has(entry.enemyId),
                done: isRoundDone(entry.enemyId, completedIds) ? 1 : 0,
            };
        });
    });
};

const groupBySection = (roundEntries) => {
    const byColor = new Map();
    for (const entry of roundEntries) {
        if (!byColor.has(entry.sectionName)) byColor.set(entry.sectionName, []);
        byColor.get(entry.sectionName).push(entry);
    }
    return [...byColor.entries()].map(([sectionName, sectionEntries]) => ({ sectionName, sectionEntries }));
};

export const RoundsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Summoning Rounds" });
    const entries = van.state([]);
    const completedIdsState = van.state([]);
    const endlessState = van.state(0);
    const doneStates = new Map();
    const endlessNode = div({ class: "account-item-stack" });
    const reconcileEndless = createStaticRowReconciler(endlessNode);
    const sectionListNode = div({ class: "account-item-stack" });
    const reconcileSectionList = createStaticRowReconciler(sectionListNode);
    const sectionNodes = new Map();
    const reconcilers = new Map();

    const getSectionNode = (sectionName) => {
        if (!sectionNodes.has(sectionName)) {
            const node = div({ class: "account-item-stack" });
            sectionNodes.set(sectionName, node);
            reconcilers.set(sectionName, createStaticRowReconciler(node));
        }
        return sectionNodes.get(sectionName);
    };

    const reconcileSection = (sectionName, sectionEntries) => {
        const node = getSectionNode(sectionName);
        reconcilers.get(sectionName)(sectionEntries.map((entry) => `${entry.index}:${entry.enemyId}`).join("|"), () =>
            sectionEntries.map((entry) =>
                RoundRow({
                    entry,
                    doneState: getOrCreateState(doneStates, entry.index),
                    completedIdsState,
                })
            )
        );
        return node;
    };

    const reconcileSections = () => {
        reconcileEndless("endless-rounds", () => EndlessRoundRow({ valueState: endlessState }));

        const sections = groupBySection(entries.val);
        reconcileSectionList(
            sections
                .map((section) =>
                    [
                        section.sectionName,
                        ...section.sectionEntries.map((entry) => `${entry.index}:${entry.enemyId}`),
                    ].join(":")
                )
                .join("||"),
            () => [
                AccountSection({
                    title: "ENDLESS",
                    note: "OptionsListAccount[319]",
                    body: endlessNode,
                }),
                AccountSection({
                    title: "NORMAL ROUNDS",
                    note: `${entries.val.length} ROUND DEFINITIONS LOADED`,
                    body: div({ class: "tab-empty" }, "Coming soon"),
                }),
                div(
                    { hidden: true },
                    ...sections.map((section) =>
                        AccountSection({
                            title: `${section.sectionName.toUpperCase()} ROUNDS`,
                            note: () =>
                                `${
                                    section.sectionEntries.filter(
                                        (entry) => entry.countAsDone && getOrCreateState(doneStates, entry.index).val
                                    ).length
                                } / ${section.sectionEntries.length} DONE`,
                            body: reconcileSection(section.sectionName, section.sectionEntries),
                        })
                    )
                ),
            ]
        );
    };

    const load = async () =>
        run(async () => {
            const [rawCompletedIds, rawRoundData, rawEndless] = await Promise.all([
                gga(NORMAL_ROUNDS_PATH),
                readCList("SummonEnemies"),
                gga(ENDLESS_ROUNDS_PATH),
            ]);

            completedIdsState.val = toIndexedArray(rawCompletedIds ?? []);
            endlessState.val = toInt(rawEndless, { min: 0 });
            entries.val = buildRoundEntries(rawRoundData, rawCompletedIds);

            for (const entry of entries.val) {
                getOrCreateState(doneStates, entry.index).val = entry.done;
            }

            reconcileSections();
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        () =>
            entries.val.length === 0 ? div({ class: "tab-empty" }, "No Summoning round definitions were found.") : null,
        sectionListNode
    );

    return PersistentAccountListPage({
        title: "ROUNDS",
        description:
            "Toggle normal round completion from Summon[1] and set endless rounds from OptionsListAccount[319]. Normal sections follow the in-game stone order.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SUMMONING ROUNDS",
        errorTitle: "SUMMONING ROUNDS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
