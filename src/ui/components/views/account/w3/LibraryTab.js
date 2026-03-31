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
import { readComputed, readGga, writeGga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AsyncFeatureBody, toNum, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p, strong } = van.tags;

// ── Game helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the list of class page IDs available to a character of the given
 * classId, mirroring the in-game Talent Library logic.
 */
function returnClassesLikeGame(classId) {
    const out = [];

    if (classId < 6) {
        for (let i = 0; i < classId; i++) out.push(i + 1);
        return out;
    }

    const tierBase = 6 + 12 * Math.floor((classId - 6) / 12);
    const sub = classId - tierBase;

    if (sub > 7) {
        out.push(tierBase);
        out.push(tierBase + Math.ceil(sub / 12));
        out.push(tierBase + Math.ceil((sub - 5) / 2));
        out.push(tierBase + (sub - 4));
    } else if (sub > 3) {
        out.push(tierBase);
        out.push(tierBase + Math.ceil(sub / 12));
        out.push(tierBase + Math.ceil((sub - 1) / 2));
    } else if (sub > 1) {
        out.push(tierBase);
        out.push(tierBase + Math.ceil(sub / 12));
    } else if (sub > 0) {
        out.push(tierBase);
    }

    out.push(classId);
    return out;
}

/**
 * The in-game Library blocks certain talents even though they appear on valid
 * Library pages. The game checks:
 *
 *   E.contains(cList.RANDOlist[16], talentId)
 *
 * Those talents show:
 *   "This Book is not Available"
 *
 * This helper turns that list into a Set<number>.
 */
function getBlockedLibraryTalentIds(rawBlockedList) {
    const out = new Set();
    const list = toIndexedArray(rawBlockedList ?? []);

    for (const value of list) {
        const n = Number(value);
        if (Number.isFinite(n)) out.add(n);
    }

    return out;
}

// ── TalentRow ────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   talentId: number,
 *   talentName: string,
 *   curState: object,
 *   maxState: object,
 *   maxBookLv: number,
 *   isBookAvailable: boolean,
 *   bonus: number,
 * }} props
 */
const TalentRow = ({ talentId, talentName, curState, maxState, maxBookLv, isBookAvailable, bonus }) => {
    const maxInput = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        maxInput.val = String(Math.max(0, Math.min(maxBookLv, toNum(maxState.val ?? 0))));
    });

    const isLoading = () => status.val === "loading";

    const setMax = (raw) =>
        run(
            async () => {
                if (!isBookAvailable) return;

                const lvl = Math.max(0, Math.min(maxBookLv, toNum(raw)));
                const path = `SkillLevelsMAX[${talentId}]`;
                await writeGga(path, lvl);
                const verified = Math.max(0, Math.min(maxBookLv, Math.round(Number(await readGga(path)))));
                if (verified !== lvl) throw new Error(`Write mismatch at ${path}: expected ${lvl}, got ${verified}`);
                return verified;
            },
            {
                onSuccess: (verified) => {
                    if (typeof verified !== "number") return;
                    maxState.val = verified;
                    maxInput.val = String(verified);
                },
            }
        );

    return div(
        {
            class: () =>
                [
                    "feature-row talent-row",
                    !isBookAvailable ? "talent-row--unavailable" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, talentId),
            div(
                { class: "talent-row__text" },
                span({ class: "feature-row__name" }, talentName),
                !isBookAvailable
                    ? div({ class: "talent-row__notice" }, "This is not a Library book and can't be set.")
                    : null
            )
        ),
        bonus > 0
            ? span(
                  { class: "feature-row__badge talent-row__badge--with-bonus" },
                  () => curState.val,
                  span({ class: "talent-row__bonus" }, ` +${bonus}`),
                  () => ` / ${maxState.val}`
              )
            : span({ class: "feature-row__badge" }, () => `${curState.val} / ${maxState.val}`),
        isBookAvailable
            ? div(
                  { class: "feature-row__controls" },
                  NumberInput({
                      mode: "int",
                      value: maxInput,
                      oninput: (e) => (maxInput.val = e.target.value),
                      onDecrement: () => (maxInput.val = String(Math.max(0, toNum(maxInput.val) - 1))),
                      onIncrement: () => (maxInput.val = String(Math.min(maxBookLv, toNum(maxInput.val) + 1))),
                  }),
                  button(
                      {
                          type: "button",
                          onmousedown: (e) => e.preventDefault(),
                          class: () =>
                              [
                                  "feature-btn",
                                  "feature-btn--apply",
                                  isLoading() ? "feature-btn--loading" : "",
                                  status.val === "success" ? "feature-row--success" : "",
                                  status.val === "error" ? "feature-row--error" : "",
                              ]
                                  .filter(Boolean)
                                  .join(" "),
                          disabled: isLoading,
                          onclick: (e) => {
                              e.preventDefault();
                              setMax(maxInput.val);
                          },
                      },
                      "SET MAX"
                  )
              )
            : null
    );
};

// ── LibraryTab ───────────────────────────────────────────────────────────────

export const LibraryTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const maxBookLvHeader = van.state(null);
    const { status: bulkStatus, run: runBulk } = useWriteStatus();

    const curStates = new Map();
    const maxStates = new Map();

    const getCurState = (talentId) => {
        if (!curStates.has(talentId)) curStates.set(talentId, van.state(0));
        return curStates.get(talentId);
    };

    const getMaxState = (talentId) => {
        if (!maxStates.has(talentId)) maxStates.set(talentId, van.state(0));
        return maxStates.get(talentId);
    };

    // MAX ALL only affects talents whose books are actually available in Library.
    const doMaxAll = async () => {
        if (!data.val?.groups?.length) return;
        await runBulk(async () => {
            const cap = data.val.maxBookLv;
            const blocked = data.val.blockedLibraryTalentIds ?? new Set();
            const writtenIds = [];

            for (const group of data.val.groups) {
                for (const t of group.talents) {
                    if (blocked.has(Number(t.talentId))) continue;
                    await writeGga(`SkillLevelsMAX[${t.talentId}]`, cap);
                    writtenIds.push(t.talentId);
                    await new Promise((r) => setTimeout(r, 20));
                }
            }

            if (writtenIds.length === 0) return;

            const rawVerified = await readGga("SkillLevelsMAX");
            const verifiedArr = toIndexedArray(rawVerified ?? []);
            for (const talentId of writtenIds) {
                const verified = Math.max(0, Math.min(cap, Math.round(Number(verifiedArr[talentId] ?? 0))));
                if (verified !== cap)
                    throw new Error(`Write mismatch at SkillLevelsMAX[${talentId}]: expected ${cap}, got ${verified}`);
                getMaxState(talentId).val = verified;
            }
        });
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;

        try {
            const [
                rawUserInfo,
                rawCharClass,
                rawSkillLevels,
                rawSkillLevelsMAX,
                rawTalentOrder,
                rawTalentIconNames,
                rawClassNames,
                rawBlockedLibraryTalents,
                rawMaxBookLv,
                rawTalentDL2,
            ] = await Promise.all([
                readGga("UserInfo[0]"),
                readGga("CharacterClass"),
                readGga("SkillLevels"),
                readGga("SkillLevelsMAX"),
                readCList("TalentOrder"),
                readCList("TalentIconNames"),
                readCList("ClassNames"),
                readCList("RANDOlist[16]").catch(() => []),
                readComputed("workbench", "maxBookLv", [0, 0]).catch(() => 0),
                readGga("DNSM.h.TalentDL2").catch(() => []),
            ]);

            if (rawUserInfo === null || rawUserInfo === undefined) {
                error.val = "select-char";
                return;
            }

            const classId = toNum(rawCharClass);
            if (!classId) {
                error.val = "No active character loaded.";
                return;
            }

            const maxBookLv = Math.max(1, toNum(rawMaxBookLv));
            maxBookLvHeader.val = maxBookLv;

            const skillLevels = toIndexedArray(rawSkillLevels ?? []);
            const skillLevelsMAX = toIndexedArray(rawSkillLevelsMAX ?? []);
            const talentOrder = toIndexedArray(rawTalentOrder ?? []);
            const talentIconNames = toIndexedArray(rawTalentIconNames ?? []);
            const classNames = toIndexedArray(rawClassNames ?? []);
            const talentDL2 = toIndexedArray(rawTalentDL2 ?? []);
            const blockedLibraryTalentIds = getBlockedLibraryTalentIds(rawBlockedLibraryTalents);

            const getTalentName = (talentId) => talentIconNames?.[talentId] || `Talent ${talentId}`;

            const classIds = returnClassesLikeGame(classId);
            const activeClassName = classNames[classId] || `Class ${classId}`;

            // Collect all unique talent IDs first so we can batch-fetch bonuses.
            const allTalentIds = [];
            for (const cId of classIds) {
                for (let slot = 0; slot < 15; slot++) {
                    const talentId = talentOrder[15 * (cId - 1) + slot];
                    if (talentId !== null) allTalentIds.push(talentId);
                }
            }

            // Fetch bonus levels for all talents in parallel.
            const bonusResults = await Promise.all(
                allTalentIds.map((talentId) =>
                    readComputed("runCode", "AllTalentLV", [String(talentId)]).catch(() => 0)
                )
            );
            const bonusMap = new Map();
            allTalentIds.forEach((talentId, i) => {
                bonusMap.set(talentId, toNum(bonusResults[i]));
            });

            const groups = classIds
                .map((cId, groupIndex) => {
                    const className = classNames[cId] || `Class ${cId}`;
                    const availablePoints = toNum(talentDL2[groupIndex]);
                    const talents = [];

                    for (let slot = 0; slot < 15; slot++) {
                        const talentId = talentOrder[15 * (cId - 1) + slot];
                        if (talentId === null) continue;

                        getCurState(talentId).val = toNum(skillLevels[talentId]);
                        getMaxState(talentId).val = toNum(skillLevelsMAX[talentId]);

                        talents.push({
                            talentId,
                            talentName: getTalentName(talentId),
                            isBookAvailable: !blockedLibraryTalentIds.has(Number(talentId)),
                            bonus: bonusMap.get(talentId) ?? 0,
                        });
                    }

                    return { classId: cId, className, availablePoints, talents };
                })
                .filter((g) => g.talents.length > 0);

            data.val = {
                activeClassName,
                maxBookLv,
                groups,
                blockedLibraryTalentIds,
            };
        } catch (e) {
            error.val = e?.message ?? "Failed to load library";
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    load(true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => {
            if (message === "select-char") {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CHARACTER SELECTED",
                    subtitle: "Select a character in-game before using this tab.",
                });
            }
            if (message === "No active character loaded.") {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CHARACTER",
                    subtitle: "No active character loaded.",
                });
            }
            return EmptyState({
                icon: Icons.SearchX(),
                title: "LOAD FAILED",
                subtitle: message,
            });
        },
        isEmpty: (resolved) => !resolved.groups.length,
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO DATA",
                subtitle: "No library data found for this character.",
            }),
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                div(
                    { class: "talents-info-banner" },
                    div(
                        { class: "talents-info-banner__item" },
                        span({ class: "talents-info-banner__label" }, "Active Class"),
                        strong({ class: "talents-info-banner__value" }, resolved.activeClassName)
                    )
                ),
                ...resolved.groups.flatMap((group) => [
                    div(
                        { class: "talents-group-header" },
                        span({ class: "talents-group-header__name" }, group.className),
                        span(
                            { class: "talents-group-header__points" },
                            group.availablePoints.toLocaleString(),
                            span({ class: "talents-group-header__points-label" }, " pts")
                        )
                    ),
                    ...group.talents.map((t) =>
                        TalentRow({
                            talentId: t.talentId,
                            talentName: t.talentName,
                            curState: getCurState(t.talentId),
                            maxState: getMaxState(t.talentId),
                            maxBookLv: resolved.maxBookLv,
                            isBookAvailable: t.isBookAvailable,
                            bonus: t.bonus,
                        })
                    ),
                ])
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "LIBRARY"),
                p(
                    { class: "feature-header__desc" },
                    "Set max talent levels for the active in-game character. Current levels are read-only."
                )
            ),
            div(
                { class: "feature-header__actions" },
                div(
                    {
                        class: () =>
                            `library-maxbooklv${maxBookLvHeader.val === null ? " library-maxbooklv--hidden" : ""}`,
                    },
                    span({ class: "library-maxbooklv__label" }, "Max Library Book:"),
                    span({ class: "library-maxbooklv__value" }, () =>
                        maxBookLvHeader.val !== null ? String(maxBookLvHeader.val) : "—"
                    )
                ),
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            [
                                "feature-btn feature-btn--apply",
                                bulkStatus.val === "loading" ? "feature-btn--loading" : "",
                                bulkStatus.val === "success" ? "feature-row--success" : "",
                                bulkStatus.val === "error" ? "feature-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                        disabled: () => bulkStatus.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doMaxAll();
                        },
                    },
                    "MAX ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        renderBody
    );
};
