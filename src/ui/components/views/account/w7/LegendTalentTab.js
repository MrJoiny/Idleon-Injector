import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputedMany } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanName, cleanNameEffect, createStaticRowReconciler, toInt } from "../accountShared.js";

const { div, span } = van.tags;

const LEGEND_TALENT_LEVELS_PATH = "Spelunk[18]";
const SECTION_SIZE = 10;
const SECTION_DEFS = [
    { id: "yellow", title: "YELLOW TALENTS", sliceStart: 0 },
    { id: "red", title: "RED TALENTS", sliceStart: 10 },
    { id: "brown", title: "BROWN TALENTS", sliceStart: 20 },
    { id: "green", title: "GREEN TALENTS", sliceStart: 30 },
];

const buildTalentRows = (rawDefinitions, rawOrder, rawLevels, rawMaxResults) => {
    const definitions = toIndexedArray(rawDefinitions ?? []);
    const order = toIndexedArray(rawOrder ?? []).map((entry) => toInt(entry, { min: 0 }));
    const levels = toIndexedArray(rawLevels ?? []);

    return SECTION_DEFS.map((section) => {
        const indexes = order.slice(section.sliceStart, section.sliceStart + SECTION_SIZE);
        const talents = indexes
            .map((talentIndex, displayIndex) => {
                const definition = toIndexedArray(definitions[talentIndex] ?? []);
                const rawName = String(definition[0] ?? "").trim();
                if (!rawName || rawName === "filler") return null;

                const maxResult = rawMaxResults[talentIndex];
                if (!maxResult?.ok) {
                    throw new Error(`LegendTalent_MaxLV failed for talent ${talentIndex}`);
                }

                return {
                    displayIndex,
                    talentIndex,
                    rawName,
                    name: cleanName(rawName, `Talent ${talentIndex}`),
                    description: cleanNameEffect(definition[5]),
                    maxLevel: toInt(maxResult.value, { min: 0 }),
                    levelState: van.state(toInt(levels[talentIndex], { min: 0 })),
                };
            })
            .filter(Boolean);

        return {
            ...section,
            talents,
        };
    });
};

const LegendTalentRow = ({ talent }) =>
    ClampedLevelRow({
        valueState: talent.levelState,
        writePath: `${LEGEND_TALENT_LEVELS_PATH}[${talent.talentIndex}]`,
        max: talent.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${talent.talentIndex}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, talent.name),
                talent.description ? span({ class: "account-row__sub-label" }, talent.description) : null
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

export const LegendTalentTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Legend Talents" });
    const sectionsState = van.state([]);
    const sectionNodes = new Map();
    const reconcilers = new Map();

    const getSectionNode = (sectionId) => {
        if (!sectionNodes.has(sectionId)) {
            const node = div({ class: "account-item-stack" });
            sectionNodes.set(sectionId, node);
            reconcilers.set(sectionId, createStaticRowReconciler(node));
        }
        return sectionNodes.get(sectionId);
    };

    const reconcileSection = (section) => {
        const node = getSectionNode(section.id);
        const reconcileRows = reconcilers.get(section.id);
        reconcileRows(section.talents.map((talent) => talent.talentIndex).join("|"), () =>
            section.talents.map((talent) => LegendTalentRow({ talent }))
        );
        return node;
    };

    const load = async () =>
        run(async () => {
            const [rawDefinitions, rawOrder, rawLevels] = await Promise.all([
                readCList("LegendTalents"),
                readCList("Spelunky[26]"),
                gga(LEGEND_TALENT_LEVELS_PATH),
            ]);

            const talentIndexes = toIndexedArray(rawOrder ?? [])
                .slice(0, SECTION_DEFS.length * SECTION_SIZE)
                .map((entry) => toInt(entry, { min: 0 }));
            const maxResults = await readComputedMany(
                "thingies",
                "LegendTalent_MaxLV",
                talentIndexes.map((talentIndex) => [talentIndex, 0])
            );
            const maxByTalentIndex = Object.fromEntries(
                talentIndexes.map((talentIndex, i) => [talentIndex, maxResults[i]])
            );
            const nextSections = buildTalentRows(rawDefinitions, rawOrder, rawLevels, maxByTalentIndex);
            const existing = sectionsState.val;

            if (existing.length === 0) {
                sectionsState.val = nextSections;
                return;
            }

            const existingById = new Map(existing.map((section) => [section.id, section]));
            for (const nextSection of nextSections) {
                const currentSection = existingById.get(nextSection.id);
                if (!currentSection) continue;

                const currentByTalentIndex = new Map(
                    currentSection.talents.map((talent) => [talent.talentIndex, talent])
                );
                for (const nextTalent of nextSection.talents) {
                    const currentTalent = currentByTalentIndex.get(nextTalent.talentIndex);
                    if (!currentTalent) continue;
                    currentTalent.maxLevel = nextTalent.maxLevel;
                    currentTalent.levelState.val = nextTalent.levelState.val;
                }
            }
        });

    load();

    const body = div({ class: "scrollable-panel content-stack" }, () => {
        const sections = sectionsState.val;
        return sections.length === 0
            ? div({ class: "tab-empty" }, "No Legend Talent definitions were found.")
            : div(
                  { class: "account-item-stack" },
                  ...sections.map((section) =>
                      AccountSection({
                          title: section.title,
                          note: () =>
                              `${section.talents.length} TALENTS, ${section.talents.reduce(
                                  (sum, talent) => sum + toInt(talent.levelState.val, { min: 0 }),
                                  0
                              )} LEVELS`,
                          body: reconcileSection(section),
                      })
                  )
              );
    });

    return PersistentAccountListPage({
        title: "LEGEND TALENTS",
        description:
            "Set W7 Legend Talent levels from Spelunk[18]. Display order comes from Spelunky[26], split into four color sections.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING LEGEND TALENTS",
        errorTitle: "LEGEND TALENT READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
