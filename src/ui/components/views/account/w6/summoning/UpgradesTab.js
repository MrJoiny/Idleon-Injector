import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const SUMMONING_UPGRADES_PATH = "Summon[0]";
const ESSENCE_NAMES = ["White", "Green", "Yellow", "Blue", "Purple", "Red", "Cyan", "Teal"];

const UpgradeRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${SUMMONING_UPGRADES_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${entry.maxLevel}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

const buildUpgradeEntries = (rawDefinitions, rawLevels) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[3] ?? "").trim();
            if (!rawName) return null;

            const colorIndex = toInt(definition[2], { min: 0 });
            return {
                index,
                rawName,
                name: cleanName(rawName, `Upgrade ${index + 1}`),
                colorName: ESSENCE_NAMES[colorIndex] ?? `Color ${colorIndex}`,
                level: toInt(levels[index], { min: 0 }),
                maxLevel: toInt(definition[8], { min: 0 }),
            };
        })
        .filter(Boolean);
};

const groupByColor = (entries) => {
    const byColor = new Map();
    for (const entry of entries) {
        if (!byColor.has(entry.colorName)) byColor.set(entry.colorName, []);
        byColor.get(entry.colorName).push(entry);
    }
    return [...byColor.entries()].map(([colorName, sectionEntries]) => ({ colorName, sectionEntries }));
};

export const UpgradesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Summoning Upgrades" });
    const entries = van.state([]);
    const levelStates = new Map();
    const sectionListNode = div({ class: "account-item-stack" });
    const reconcileSectionList = createStaticRowReconciler(sectionListNode);
    const sectionNodes = new Map();
    const reconcilers = new Map();

    const getSectionNode = (colorName) => {
        if (!sectionNodes.has(colorName)) {
            const node = div({ class: "account-item-stack" });
            sectionNodes.set(colorName, node);
            reconcilers.set(colorName, createStaticRowReconciler(node));
        }
        return sectionNodes.get(colorName);
    };

    const reconcileSection = ({ colorName, sectionEntries }) => {
        const node = getSectionNode(colorName);
        reconcilers.get(colorName)(sectionEntries.map((entry) => `${entry.rawName}:${entry.maxLevel}`).join("|"), () =>
            sectionEntries.map((entry) =>
                UpgradeRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
        return node;
    };

    const reconcileSections = () => {
        const sections = groupByColor(entries.val);
        reconcileSectionList(
            sections
                .map(
                    (section) =>
                        `${section.colorName}:${section.sectionEntries
                            .map((entry) => `${entry.rawName}:${entry.maxLevel}`)
                            .join("|")}`
                )
                .join("||"),
            () =>
                sections.map((section) =>
                    AccountSection({
                        title: `${section.colorName.toUpperCase()} UPGRADES`,
                        note: () =>
                            `${section.sectionEntries.length} UPGRADES, ${section.sectionEntries.reduce(
                                (sum, entry) => sum + toInt(getOrCreateState(levelStates, entry.index).val, { min: 0 }),
                                0
                            )} LEVELS`,
                        body: reconcileSection(section),
                    })
                )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawLevels, rawDefinitions] = await Promise.all([
                gga(SUMMONING_UPGRADES_PATH),
                readCList("SummonUPG"),
            ]);
            entries.val = buildUpgradeEntries(rawDefinitions, rawLevels);

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = Math.min(entry.maxLevel, entry.level);
            }

            reconcileSections();
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        () =>
            entries.val.length === 0
                ? div({ class: "tab-empty" }, "No Summoning upgrade definitions were found.")
                : null,
        sectionListNode
    );

    return PersistentAccountListPage({
        title: "UPGRADES",
        description: "Edit Summoning upgrade levels from Summon[0]. Max levels and names come from SummonUPG.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SUMMONING UPGRADES",
        errorTitle: "SUMMONING UPGRADES READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
