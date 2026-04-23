/**
 * W3 - Active Player Library Tab
 *
 * Shows all talents for the currently active in-game character only.
 * Reads live game state — not a selected database character.
 *
 * Data sources:
 *   gga.UserInfo[0]                      - null when no live character is loaded
 *   gga.CharacterClass                   - active player's class ID
 *   gga.SkillLevels[talentId]            - current talent level (display only)
 *   gga.SkillLevelsMAX[talentId]         - max talent level (editable)
 *   cList.TalentOrder        - talent IDs per class page + slot
 *   cList.TalentIconNames    - talent names
 *   cList.ClassNames         - class display names
 *   cList.RANDOlist[16]      - talents shown in Library but blocked with
 *                                          "This Book is not Available"
 *   gga.DNSM.h.TalentDL2                 - available talent points per class page (indexed by group order)
 *
 * Computed:
 *   p._customBlock_WorkbenchStuff("maxBookLv", 0, 0)             — global max book level cap
 *   x._customBlock_RunCodeOfTypeXforThingY("AllTalentLV", id)    — bonus invested levels per talent (read-only)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, readComputedMany, gga, ggaMany, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountRow } from "../components/AccountRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { getOrCreateState, toNum, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const LIBRARY_CLASS_PARENT_OFFSETS = [null, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7];

/**
 * Returns the Library class-page IDs available to the active character.
 * Each 12-class family is a small parent tree; Library shows the path from
 * family root to the active class.
 */
function getLibraryClassPageIds(classId) {
    if (classId < 6) {
        const pageIds = [];
        for (let pageId = 1; pageId <= classId; pageId++) pageIds.push(pageId);
        return pageIds;
    }

    const familyBase = 6 + 12 * Math.floor((classId - 6) / 12);
    const offsets = [];

    for (let offset = classId - familyBase; offset !== null; offset = LIBRARY_CLASS_PARENT_OFFSETS[offset]) {
        offsets.unshift(offset);
    }

    return offsets.map((offset) => familyBase + offset);
}

const getBlockedLibraryTalentIds = (rawBlockedList) => {
    const out = new Set();
    for (const value of toIndexedArray(rawBlockedList ?? [])) {
        const n = Number(value);
        if (Number.isFinite(n)) out.add(n);
    }
    return out;
};

const TalentBadge = ({ curState, maxState, bonusState }) =>
    span(
        {},
        () => curState.val,
        () => (toNum(bonusState.val) > 0 ? span({ class: "talent-row__bonus" }, ` +${bonusState.val}`) : null),
        () => ` / ${maxState.val}`
    );

const TalentRow = ({ talentId, talentName, curState, maxState, bonusState, maxBookLvState, isBookAvailable }) => {
    if (!isBookAvailable) {
        return AccountRow({
            rowClass: "talent-row talent-row--unavailable",
            info: [
                span({ class: "account-row__index" }, `#${talentId}`),
                div(
                    { class: "talent-row__text" },
                    span({ class: "account-row__name" }, talentName),
                    div({ class: "talent-row__notice" }, "This is not a Library book and can't be set.")
                ),
            ],
            badgeClass: () => (toNum(bonusState.val) > 0 ? "talent-row__badge--with-bonus" : ""),
            badge: TalentBadge({ curState, maxState, bonusState }),
        });
    }

    return EditableNumberRow({
        valueState: maxState,
        normalize: (rawValue) => Math.max(0, Math.min(toNum(maxBookLvState.val, 1), toNum(rawValue))),
        write: async (nextLevel) => {
            const path = `SkillLevelsMAX[${talentId}]`;
            return writeVerified(path, nextLevel, {
                message: `Write mismatch at ${path}: expected ${nextLevel}, got failed verification`,
            });
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${talentId}`),
            div({ class: "talent-row__text" }, span({ class: "account-row__name" }, talentName)),
        ],
        renderBadge: () => TalentBadge({ curState, maxState, bonusState }),
        badgeClass: () => (toNum(bonusState.val) > 0 ? "talent-row__badge--with-bonus" : ""),
        rowClass: "talent-row",
        controlsClass: "account-row__controls--xl",
        applyLabel: "SET MAX",
        adjustInput: (rawValue, delta, currentValue) => {
            const next = toNum(rawValue, toNum(currentValue, 0)) + delta;
            return Math.max(0, Math.min(toNum(maxBookLvState.val, 1), next));
        },
    });
};

const buildStaticMeta = async () => {
    const [rawTalentOrder, rawTalentIconNames, rawClassNames, rawBlockedLibraryTalents] = await Promise.all([
        readCList("TalentOrder"),
        readCList("TalentIconNames"),
        readCList("ClassNames"),
        readCList("RANDOlist[16]"),
    ]);

    return {
        talentOrder: toIndexedArray(rawTalentOrder ?? []),
        talentIconNames: toIndexedArray(rawTalentIconNames ?? []),
        classNames: toIndexedArray(rawClassNames ?? []),
        blockedLibraryTalentIds: getBlockedLibraryTalentIds(rawBlockedLibraryTalents),
    };
};

export const LibraryTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Library" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const activeClassNameState = van.state("");
    const maxBookLvState = van.state(null);
    const curStates = new Map();
    const maxStates = new Map();
    const bonusStates = new Map();
    const availablePointsStates = new Map();
    const listNode = div({ class: "account-list" });

    let staticMeta = null;
    let rowSignature = null;
    let currentAvailableTalentIds = [];

    const getCurState = (talentId) => getOrCreateState(curStates, talentId);
    const getMaxState = (talentId) => getOrCreateState(maxStates, talentId);
    const getBonusState = (talentId) => getOrCreateState(bonusStates, talentId);
    const getAvailablePointsState = (classId) => getOrCreateState(availablePointsStates, classId);

    const doMaxAll = async () => {
        const cap = toNum(maxBookLvState.val, 0);
        if (!currentAvailableTalentIds.length || cap <= 0) return;

        await runBulk(async () => {
            const writes = currentAvailableTalentIds
                .filter((talentId) => toNum(getMaxState(talentId).val) !== cap)
                .map((talentId) => ({ path: `SkillLevelsMAX[${talentId}]`, value: cap }));

            if (writes.length > 0) {
                const result = await ggaMany(writes);
                const failed = result.results.filter((entry) => !entry.ok);
                if (failed.length > 0) {
                    throw new Error(`Write mismatch at ${failed[0].path}: expected ${cap}, got failed verification`);
                }
            }

            for (const talentId of currentAvailableTalentIds) {
                getMaxState(talentId).val = cap;
            }
        });
    };

    const reconcileRows = ({ activeClassName, maxBookLv, groups, availableTalentIds }) => {
        const nextSignature = groups
            .map((group) =>
                [
                    group.classId,
                    group.className,
                    ...group.talents.map((talent) => `${talent.talentId}:${talent.isBookAvailable ? 1 : 0}`),
                ].join("|")
            )
            .join("||");

        currentAvailableTalentIds = availableTalentIds;
        activeClassNameState.val = activeClassName;
        maxBookLvState.val = maxBookLv;

        if (nextSignature === rowSignature) return;
        rowSignature = nextSignature;

        const rows = [
            AccountRow({
                rowClass: "account-row--info",
                info: span({ class: "account-row__name" }, "Active Class"),
                badge: () => activeClassNameState.val || "-",
            }),
            ...groups.map((group) =>
                AccountSection({
                    title: group.className,
                    meta: span(
                        { class: "library-section-points" },
                        () => getAvailablePointsState(group.classId).val.toLocaleString(),
                        span({ class: "library-section-points__label" }, " pts")
                    ),
                    body: div(
                        { class: "content-stack" },
                        ...group.talents.map((talent) =>
                            TalentRow({
                                talentId: talent.talentId,
                                talentName: talent.talentName,
                                curState: getCurState(talent.talentId),
                                maxState: getMaxState(talent.talentId),
                                bonusState: getBonusState(talent.talentId),
                                maxBookLvState,
                                isBookAvailable: talent.isBookAvailable,
                            })
                        )
                    ),
                })
            ),
        ];

        listNode.replaceChildren(...rows);
    };

    const load = async () =>
        run(async () => {
            if (!staticMeta) staticMeta = await buildStaticMeta();

            const [rawUserInfo, rawCharClass, rawSkillLevels, rawSkillLevelsMAX, rawMaxBookLv, rawTalentDL2] =
                await Promise.all([
                    gga("UserInfo[0]"),
                    gga("CharacterClass"),
                    gga("SkillLevels"),
                    gga("SkillLevelsMAX"),
                    readComputed("workbench", "maxBookLv", [0, 0]),
                    gga("DNSM.h.TalentDL2"),
                ]);

            if (rawUserInfo === null || rawUserInfo === undefined) {
                throw new Error("Select a character in-game before using this tab.");
            }

            const classId = toNum(rawCharClass);
            if (!classId) throw new Error("No active character loaded.");

            const maxBookLv = Math.max(1, toNum(rawMaxBookLv));
            const skillLevels = toIndexedArray(rawSkillLevels ?? []);
            const skillLevelsMAX = toIndexedArray(rawSkillLevelsMAX ?? []);
            const talentDL2 = toIndexedArray(rawTalentDL2 ?? []);
            const classIds = getLibraryClassPageIds(classId);
            const activeClassName = staticMeta.classNames[classId] || `Class ${classId}`;
            const getTalentName = (talentId) => staticMeta.talentIconNames?.[talentId] || `Talent ${talentId}`;
            const allTalentIds = Array.from(
                new Set(
                    classIds.flatMap((cId) =>
                        Array.from({ length: 15 }, (_, slot) => staticMeta.talentOrder[15 * (cId - 1) + slot])
                            .filter((talentId) => talentId !== null && talentId !== undefined)
                            .map((talentId) => Number(talentId))
                    )
                )
            );

            const bonusResults = await readComputedMany(
                "runCode",
                "AllTalentLV",
                allTalentIds.map((talentId) => [String(talentId)])
            );
            const bonusMap = new Map();
            allTalentIds.forEach((talentId, i) => {
                const item = bonusResults?.[i];
                if (!item?.ok) throw new Error(item?.error || `Failed to read AllTalentLV for talent ${talentId}`);
                bonusMap.set(talentId, toNum(item.value));
            });

            const availableTalentIds = [];
            const groups = classIds
                .map((cId, groupIndex) => {
                    const className = staticMeta.classNames[cId] || `Class ${cId}`;
                    const talents = [];
                    getAvailablePointsState(cId).val = toNum(talentDL2[groupIndex]);

                    for (let slot = 0; slot < 15; slot++) {
                        const rawTalentId = staticMeta.talentOrder[15 * (cId - 1) + slot];
                        if (rawTalentId === null || rawTalentId === undefined) continue;

                        const talentId = Number(rawTalentId);
                        const isBookAvailable = !staticMeta.blockedLibraryTalentIds.has(talentId);
                        getCurState(talentId).val = toNum(skillLevels[talentId]);
                        getMaxState(talentId).val = toNum(skillLevelsMAX[talentId]);
                        getBonusState(talentId).val = bonusMap.get(talentId) ?? 0;
                        if (isBookAvailable) availableTalentIds.push(talentId);

                        talents.push({
                            talentId,
                            talentName: getTalentName(talentId),
                            isBookAvailable,
                        });
                    }

                    return { classId: cId, className, talents };
                })
                .filter((group) => group.talents.length > 0);

            reconcileRows({ activeClassName, maxBookLv, groups, availableTalentIds });
        });

    load();

    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "LIBRARY",
            description: "Set max talent levels for the active in-game character. Current levels are read-only.",
            wrapActions: false,
            actions: BulkActionBar({
                leading: div(
                    {
                        class: () =>
                            `library-maxbooklv${maxBookLvState.val === null ? " library-maxbooklv--hidden" : ""}`,
                    },
                    span({ class: "library-maxbooklv__label" }, "Max Library Book:"),
                    span({ class: "library-maxbooklv__value" }, () =>
                        maxBookLvState.val !== null ? String(maxBookLvState.val) : "-"
                    )
                ),
                actions: [
                    {
                        label: "MAX ALL",
                        status: bulkStatus,
                        disabled: () => loading.val || !currentAvailableTalentIds.length,
                        tooltip: "Set all available Library books to the current max book level",
                        onClick: doMaxAll,
                    },
                ],
                refresh: {
                    onClick: load,
                    disabled: () => loading.val,
                    tooltip: "Re-read Library values from game memory",
                },
            }),
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING LIBRARY",
        persistentErrorTitle: "LIBRARY READ FAILED",
        persistentInitialWrapperClass: "account-list",
        body: listNode,
    });
};
