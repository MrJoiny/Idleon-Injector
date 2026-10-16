import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputed, readComputedMany } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { formatNumber, formattedStep, parseNumber } from "../../../../utils/numberFormat.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    cleanNameEffect,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";
import { renderTabNav } from "../tabShared.js";

const { div, span, label, input } = van.tags;
const PANES = [
    { id: "overview", label: "OVERVIEW" },
    { id: "unlocks", label: "UNLOCKS" },
    { id: "upgrades", label: "BOOSTS" },
    { id: "missions", label: "MISSIONS" },
    { id: "jellies", label: "SIDE JELLIES" },
];
const YELLOW_NAMES = [
    "Build rate bonus level",
    "Construction EXP bonus level",
    "Flaggy rate bonus level",
    "Lumi bonus level",
];

const description = (raw) =>
    cleanName(raw)
        .replace(/\u819b/g, "")
        .replace(/@/g, " ")
        .trim();
const numericInput = (raw, integer) => {
    const value = parseNumber(raw);
    return Number.isFinite(value) && value >= 0 && (!integer || Number.isSafeInteger(value)) ? value : null;
};

export const MenagerieTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Menagerie" });
    const activePane = van.state("overview");
    const saving = van.state(false);
    const lumiRate = van.state(0);
    const states = new Map();
    const missionProgress = new Map();
    const missionTargets = new Map();
    const lists = Object.fromEntries(PANES.map(({ id }) => [id, div({ class: "account-item-stack" })]));
    const reconcilers = Object.fromEntries(PANES.map(({ id }) => [id, createStaticRowReconciler(lists[id])]));
    const state = (path) => getOrCreateState(states, path);
    const disabled = () => loading.val || saving.val;
    let unlockCount = 0;

    const load = async () =>
        run(async () => {
            const [rawMenagerie, green, rawMissions, rawUnlocks, rawUpgrades, rawCaves, rate, progress, targets] =
                await Promise.all([
                    gga("Menagerie"),
                    gga("Spelunk[17][28]"),
                    readCList("Research[52]"),
                    readCList("Research[56]"),
                    readCList("Research[57]"),
                    readCList("Spelunky[6]"),
                    readComputed("menagerie", "LumiGainRate", [0, 0]),
                    readComputedMany(
                        "menagerie",
                        "MissionProg",
                        Array.from({ length: 33 }, (_, i) => [i, 0])
                    ),
                    readComputedMany(
                        "menagerie",
                        "Cost",
                        Array.from({ length: 33 }, (_, i) => [0, i])
                    ),
                ]);
            const menagerie = toIndexedArray(rawMenagerie).map(toIndexedArray);
            const missions = toIndexedArray(rawMissions);
            const unlocks = toIndexedArray(rawUnlocks);
            const upgrades = toIndexedArray(rawUpgrades);
            const caves = toIndexedArray(rawCaves);
            if (
                menagerie.length < 8 ||
                menagerie[0].length < 16 ||
                menagerie[1].length < 33 ||
                menagerie[2].length < 25 ||
                menagerie[3].length < 25 ||
                menagerie[4].length < 14 ||
                menagerie[5].length < 9 ||
                menagerie[6].length < 17 ||
                menagerie[7].length < 17 ||
                missions.length !== 33 ||
                unlocks.length !== 25 ||
                upgrades.length !== 25
            ) {
                throw new Error("Menagerie data is uninitialized or does not match this game version.");
            }
            unlockCount = unlocks.length;
            for (let group = 0; group < 8; group++) {
                menagerie[group].forEach((value, index) => {
                    state(`Menagerie[${group}][${index}]`).val = Number(value);
                });
            }
            state("Spelunk[17][28]").val = Number(green);
            lumiRate.val = rate;
            for (let i = 0; i < missions.length; i++) {
                getOrCreateState(missionProgress, i, "Unavailable").val = progress[i]?.ok
                    ? progress[i].value
                    : "Unavailable";
                getOrCreateState(missionTargets, i, "Unavailable").val = targets[i]?.ok
                    ? targets[i].value
                    : "Unavailable";
            }

            reconcilers.overview("overview", () => [
                numberRow("Lumi balance", "Menagerie[0][0]", false, null, true),
                numberRow("Unspent Shell EXP", "Menagerie[0][1]", false, null, true),
                numberRow("Shell rank", "Menagerie[0][2]", true, null, true),
                div(
                    { class: "account-row" },
                    div({ class: "account-row__info" }, span({ class: "account-row__name" }, "Lumi per hour")),
                    span({ class: "account-row__badge" }, () => formatNumber(lumiRate.val))
                ),
            ]);
            reconcilers.unlocks(JSON.stringify(unlocks), () =>
                unlocks.map((text, i) => toggleRow(description(text), `Menagerie[2][${i}]`, `Unlock #${i}`))
            );
            reconcilers.upgrades(JSON.stringify(upgrades), () =>
                upgrades.map((text, i) =>
                    numberRow(cleanNameEffect(description(text)), `Menagerie[3][${i}]`, true, `Upgrade #${i}`)
                )
            );
            reconcilers.missions(JSON.stringify(missions), () => missions.map((text, i) => missionRow(text, i)));
            reconcilers.jellies(JSON.stringify(caves), () => [
                AccountSection({
                    title: "PURPLE / PINK JELLYFISH",
                    body: [
                        numberRow("Shell purchase count", "Menagerie[0][3]"),
                        numberRow("Lumi bonus level", "Menagerie[0][4]"),
                    ],
                }),
                AccountSection({
                    title: "BLUE JELLYFISH",
                    body: numberRow("Deposited ladles", "Menagerie[0][5]", false),
                }),
                AccountSection({
                    title: "RED JELLYFISH",
                    note: "Readings consume all accumulated rest days. Deposited materials persist.",
                    body: [
                        numberRow("Accumulated rest days", "Menagerie[0][6]"),
                        ...Array.from({ length: 14 }, (_, i) =>
                            numberRow(
                                `${/^Name\d*$/i.test(String(caves[i])) ? `Cave ${i + 1}` : cleanName(caves[i], `Cave ${i + 1}`)} deposited materials`,
                                `Menagerie[4][${i}]`,
                                false,
                                `Material #${i}`
                            )
                        ),
                    ],
                }),
                AccountSection({
                    title: "SILVER JELLYFISH",
                    body: [
                        numberRow("Miscellaneous Obol multiplier level", "Menagerie[0][9]", true, "Normal cap: 100"),
                        numberRow("Obol auto-trash rate level", "Menagerie[0][10]", true, "Normal cap: 190"),
                    ],
                }),
                AccountSection({
                    title: "YELLOW JELLYFISH",
                    body: [
                        ...YELLOW_NAMES.map((name, i) => numberRow(name, `Menagerie[0][${11 + i}]`)),
                        numberRow("Accumulated build progress", "Menagerie[0][15]", false),
                    ],
                }),
                AccountSection({
                    title: "GREEN JELLYFISH",
                    note: "Collect the nametag in-game at 12 progress.",
                    body: numberRow("Spelunking progress", "Spelunk[17][28]"),
                }),
            ]);
        });

    const save = async (task) => {
        if (disabled()) throw new Error("Another Menagerie operation is in progress.");
        saving.val = true;
        try {
            return await task();
        } finally {
            await load();
            saving.val = false;
        }
    };

    const numberRow = (name, path, integer = true, note = null, formatted = false) =>
        EditableNumberRow({
            valueState: state(path),
            normalize: (raw) => numericInput(raw, integer),
            write: (next) => save(() => writeVerified(path, next)),
            renderInfo: () =>
                div(
                    { class: "account-row__name-group" },
                    span({ class: "account-row__name" }, name),
                    note ? span({ class: "account-row__sub-label" }, note) : null
                ),
            renderBadge: formatNumber,
            adjustInput: (raw, delta, current) => {
                const value = numericInput(raw, integer) ?? current;
                return Math.max(0, value + delta * (formatted ? formattedStep(value) : 1));
            },
            disabled,
            rowClass: "account-row--wide-controls",
            controlsClass: "account-row__controls--xl",
            inputMode: integer ? "int" : "float",
            inputProps: {
                "aria-label": name,
                ...(formatted ? { formatter: largeFormatter, parser: largeParser } : {}),
            },
        });

    const toggleRow = (name, path, note) => {
        const { status, run: write } = useWriteStatus();
        const message = van.state("");
        return div(
            { class: "account-row" },
            div(
                { class: "account-row__info" },
                div(
                    { class: "account-row__name-group" },
                    span({ class: "account-row__name" }, name),
                    span({ class: "account-row__sub-label" }, note),
                    span({ class: "account-write-feedback", role: "status" }, () => message.val)
                )
            ),
            span({ class: "account-row__badge" }, () => (state(path).val >= 1 ? "ON" : "OFF")),
            label(
                { class: "toggle-switch" },
                input({
                    type: "checkbox",
                    role: "switch",
                    "aria-label": name,
                    checked: () => state(path).val >= 1,
                    disabled: () => disabled() || status.val === "loading",
                    onchange: (event) => {
                        const next = event.target.checked ? 1 : 0;
                        event.target.checked = state(path).val >= 1;
                        message.val = "Saving…";
                        void write(() => save(() => writeVerified(path, next)), {
                            onSuccess: () => {
                                message.val = "Saved";
                            },
                            onError: (error) => {
                                message.val = error.message;
                            },
                        });
                    },
                }),
                span({ class: "slider" })
            )
        );
    };

    const missionRow = (text, index) =>
        EditableNumberRow({
            valueState: state(`Menagerie[1][${index}]`),
            normalize: (raw) => numericInput(raw, true),
            write: (next) => save(() => writeVerified(`Menagerie[1][${index}]`, next)),
            renderInfo: () => [
                span({ class: "account-row__index" }, `#${index}`),
                div(
                    { class: "account-row__name-group" },
                    span({ class: "account-row__name" }, () =>
                        description(text).replace(
                            /[{$]/g,
                            `${index === 20 || index === 24 ? "10^" : ""}${formatNumber(missionTargets.get(index).val)}`
                        )
                    ),
                    span(
                        { class: "account-row__sub-label" },
                        () =>
                            `Progress${index === 20 || index === 24 ? " (log10)" : ""}: ${formatNumber(missionProgress.get(index).val)} / ${formatNumber(missionTargets.get(index).val)}`
                    )
                ),
            ],
            renderBadge: (value) => `${value} COMPLETIONS`,
            adjustInput: (raw, delta, current) => Math.max(0, (numericInput(raw, true) ?? current) + delta),
            disabled,
            rowClass: "account-row--wide-controls",
            controlsClass: "account-row__controls--xl",
            inputProps: { "aria-label": `Mission ${index} completions` },
        });

    const bulk = useWriteStatus();
    const bulkMessage = van.state("");
    const unlockAll = ActionButton({
        label: () => (bulk.status.val === "loading" ? "UNLOCKING…" : "UNLOCK ALL"),
        status: bulk.status,
        disabled,
        onClick: () => {
            bulkMessage.val = "Saving…";
            void bulk.run(
                () =>
                    save(() =>
                        writeManyVerified(
                            Array.from({ length: unlockCount }, (_, i) => ({
                                path: `Menagerie[2][${i}]`,
                                value: 1,
                            }))
                        )
                    ),
                {
                    onSuccess: () => {
                        bulkMessage.val = "All 25 unlocks saved.";
                    },
                    onError: (error) => {
                        bulkMessage.val = error.message;
                    },
                }
            );
        },
    });

    const body = div(
        { class: "scrollable-panel content-stack" },
        ...PANES.map(({ id, label: title }) =>
            div(
                {
                    "data-menagerie-pane": id,
                    class: () => (activePane.val === id ? "content-stack" : "is-hidden-until-ready"),
                },
                AccountSection({
                    title,
                    note:
                        id === "missions"
                            ? "Set completion counts directly. Edit Shell EXP separately in Overview."
                            : null,
                    meta:
                        id === "unlocks"
                            ? [
                                unlockAll,
                                span({ class: "account-write-feedback", role: "status" }, () => bulkMessage.val),
                            ]
                            : null,
                    body: lists[id],
                })
            )
        )
    );
    load();
    return PersistentAccountListPage({
        title: "LUMINOUS MENAGERIE",
        description: "Edit progression directly. Normal caps and unlock requirements do not restrict these editors.",
        actions: RefreshButton({ onRefresh: load, disabled }),
        subNav: renderTabNav({
            tabs: PANES,
            activeId: activePane,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        state: { loading, error },
        loadingText: "READING MENAGERIE",
        errorTitle: "MENAGERIE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
