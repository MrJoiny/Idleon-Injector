/**
 * W1 - Pets Tab
 *
 * Companion definitions come from live game data:
 *   cList.CompanionDB
 *   cList.CompanionSetsInfo
 *   MonsterDefinitionsGET.h[monsterKey].Name
 *
 * Selection is the pet-bonus token list in OptionsListAccount[606]: a CSV of
 * CompanionDB indices. Toggling a pet writes that list live, which activates the
 * pet's account-wide bonus regardless of how many tokens are actually owned.
 */

import van from "../../../../vendor/van-1.6.0.js";
import {
    executeCheatAction,
    fetchCheatStates,
    fetchConfig,
    gga,
    readCList,
    readGgaEntries,
    saveConfigFile,
    updateSessionConfig,
} from "../../../../services/api.js";
import { EmptyState } from "../../../EmptyState.js";
import { SearchBar } from "../../../SearchBar.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { cleanName, cleanNameEffect, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, button, span, label, input } = van.tags;

const TOKEN_PATH = "OptionsListAccount[606]";

// Pets+ rides on the existing W1 Companion cheat: `cheatConfig.w1.companion.companions`
// is a comma-separated id list, and the cheat reports every listed pet to the game as
// owned at the upgraded tier. An EMPTY list is the shipped default and means "every pet",
// so "no Pets+ pets" is expressed by clearing the list and turning the cheat off.
const parsePlusIds = (value) => {
    if (!Array.isArray(value)) return parseIdList(value);
    // Hand-written array form: "<id>,a,b,c,<tier>" - only tier 1 counts as Pets+.
    return value
        .map((entry) => {
            const parts = String(entry).split(",");
            if (parts.length > 4 && parts[4].trim() !== "1") return Number.NaN;
            return Number.parseInt(parts[0], 10);
        })
        .filter((id) => Number.isFinite(id));
};

const normalizeSearchText = (value) => String(value ?? "").trim().toLowerCase();

const isUnusedPetText = (value) => {
    const text = normalizeSearchText(value);
    return text.includes("not officially in the game") && text.includes("may never be");
};

const parseIdList = (value) =>
    String(value ?? "")
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id));

const serializeIds = (idSet) => [...idSet].sort((a, b) => a - b).join(",");

const expandRange = (start, end) => {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const unwrapSingleEntry = (value) => {
    let current = value;
    while (true) {
        const list = toIndexedArray(current);
        if (list.length !== 1) return current;
        current = list[0];
    }
};

const buildCompanionRows = (rawCompanionDb, rawMonsterDefs) =>
    toIndexedArray(rawCompanionDb)
        .map((entry, id) => {
            const row = toIndexedArray(entry);
            const monsterKey = row[0];
            const name = cleanName(rawMonsterDefs?.[monsterKey]?.Name, "");
            if (!name) return null;

            const effect = cleanNameEffect(row[1], "No buff text");
            // Column 10 is the upgraded-tier buff text the game shows for a Pets+ pet.
            const plusEffect = cleanNameEffect(row[10], effect);

            return { id, monsterKey, name, effect, plusEffect, isUnused: isUnusedPetText(effect) };
        })
        .filter(Boolean);

const buildSections = (pets, rawSetsInfo) => {
    const fallbackIds = pets.map((pet) => pet.id);
    const validIds = new Set(fallbackIds);
    const seenIds = new Set();
    const sections = [];
    const setsInfo = toIndexedArray(rawSetsInfo);

    const pushSection = (sectionLabel, ids) => {
        const nextIds = [...new Set(ids)].filter((id) => validIds.has(id) && !seenIds.has(id));
        if (!nextIds.length) return;
        nextIds.forEach((id) => seenIds.add(id));
        sections.push({ label: sectionLabel, ids: nextIds });
    };

    const primaryGroups = String(unwrapSingleEntry(setsInfo[0]) ?? "")
        .split("|")
        .map((group) => parseIdList(group))
        .filter((group) => group.length > 0);

    primaryGroups.forEach((group, index) => {
        const ids = group.length >= 2 ? expandRange(group[0], group[1]) : group;
        pushSection(`SET ${index + 1}`, ids);
    });

    toIndexedArray(setsInfo[1]).forEach((group, index) => {
        pushSection(`SPECIAL ${index + 1}`, parseIdList(unwrapSingleEntry(group)));
    });

    toIndexedArray(setsInfo[2]).forEach((group, index) => {
        pushSection(`EXTRA ${index + 1}`, parseIdList(unwrapSingleEntry(group)));
    });

    const leftoverIds = fallbackIds.filter((id) => !seenIds.has(id));
    if (leftoverIds.length) pushSection(sections.length ? "OTHER" : "ALL PETS", leftoverIds);

    return sections;
};

// The "+" control is a sibling of the card rather than a child, because the card is
// itself a button and buttons cannot nest.
const CompanionCard = ({ companion, enabledIds, isPlus, onToggle, onTogglePlus }) =>
    div(
        { class: "companion-card-wrap" },
        button(
            {
                type: "button",
                class: () =>
                    [
                        "companion-card",
                        enabledIds.val.has(companion.id) && "companion-card--enabled",
                        isPlus(companion.id) && "companion-card--plus",
                    ]
                        .filter(Boolean)
                        .join(" "),
                "aria-pressed": () => enabledIds.val.has(companion.id),
                onclick: () => onToggle(companion.id),
                title: "Click: toggle this pet's account bonus (pet token).",
            },
            div(
                { class: "companion-card__top" },
                div({ class: "companion-card__name" }, companion.name),
                span({ class: "companion-card__id" }, `ID ${companion.id}`)
            ),
            div({ class: "companion-card__effect" }, () =>
                isPlus(companion.id) ? companion.plusEffect : companion.effect
            )
        ),
        withTooltip(
            button(
                {
                    type: "button",
                    class: () => ["companion-plus", isPlus(companion.id) && "companion-plus--on"].filter(Boolean).join(" "),
                    "aria-pressed": () => isPlus(companion.id),
                    "aria-label": `Pets+ tier for ${companion.name}`,
                    onclick: () => onTogglePlus(companion.id),
                },
                "+"
            ),
            "Pets+ tier. Only while the injector runs, and it clears this pet's pet token."
        )
    );

export const CompanionsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Pets" });
    const { status: writeStatus, run: runWrite } = useWriteStatus();

    const companions = van.state([]);
    const sections = van.state([]);
    const enabledIds = van.state(new Set());
    const plusIds = van.state(new Set());
    // True when the W1 Companion cheat is on with an empty list, which the game reads as
    // "every pet, upgraded". The cards have to show that, not an empty selection.
    const plusAll = van.state(false);
    const hideUnused = van.state(false);
    const searchQuery = van.state("");

    const isPlus = (id) => plusAll.val || plusIds.val.has(id);

    const eligibleIds = () => companions.val.filter((companion) => !companion.isUnused).map((companion) => companion.id);

    const load = () =>
        runLoad(async () => {
            const [rawCompanionDb, rawSetsInfo] = await Promise.all([
                readCList("CompanionDB"),
                readCList("CompanionSetsInfo"),
            ]);
            const monsterKeys = [
                ...new Set(toIndexedArray(rawCompanionDb).map((entry) => toIndexedArray(entry)[0]).filter(Boolean)),
            ];
            const monsterDefs = monsterKeys.length
                ? await readGgaEntries("MonsterDefinitionsGET.h", monsterKeys, ["Name"])
                : {};

            const nextCompanions = buildCompanionRows(rawCompanionDb, monsterDefs);
            const validIdSet = new Set(nextCompanions.map((companion) => companion.id));

            companions.val = nextCompanions;
            sections.val = buildSections(nextCompanions, rawSetsInfo);

            const tokenValue = await gga(TOKEN_PATH);
            enabledIds.val = new Set(parseIdList(tokenValue).filter((id) => validIdSet.has(id)));

            const [config, cheatStates] = await Promise.all([fetchConfig(), fetchCheatStates()]);
            const cheatOn = !!cheatStates?.data?.w1?.companion;
            const configured = config?.cheatConfig?.w1?.companion?.companions ?? "";
            plusAll.val = cheatOn && !configured;
            plusIds.val = cheatOn
                ? new Set(parsePlusIds(configured).filter((id) => validIdSet.has(id)))
                : new Set();
        });

    const writeTokens = (idSet) =>
        runWrite(async () => {
            await writeVerified(TOKEN_PATH, serializeIds(idSet));
            enabledIds.val = idSet;
        });

    // /api/toggle flips a cheat rather than setting it, so acting on the state this tab
    // loaded with can switch it off while reporting success. Re-read, act, then confirm.
    const setCompanionCheat = async (wanted) => {
        const before = !!(await fetchCheatStates())?.data?.w1?.companion;
        if (before !== wanted) await executeCheatAction("w1 companion");
        const after = !!(await fetchCheatStates())?.data?.w1?.companion;
        if (after !== wanted) throw new Error(`Could not turn the W1 Companion cheat ${wanted ? "on" : "off"}`);
    };

    // /api/config/save rewrites config.custom.js from whatever it is handed, so it needs
    // the whole config - a partial would drop every other saved override.
    const persistConfig = async () => {
        const config = await fetchConfig();
        if (!config?.cheatConfig) throw new Error("Could not read the config back to save it");
        await saveConfigFile({
            startupCheats: config.startupCheats ?? [],
            cheatConfig: config.cheatConfig,
            injectorConfig: config.injectorConfig,
        });
    };

    const writePlus = (idSet) =>
        runWrite(async () => {
            const ids = [...idSet].sort((a, b) => a - b);
            await updateSessionConfig({ cheatConfig: { w1: { companion: { companions: ids.join(",") } } } });
            await setCompanionCheat(ids.length > 0);
            await persistConfig();
            plusIds.val = idSet;
            plusAll.val = false;
        });

    const isBusy = () => loading.val || writeStatus.val === "loading";

    // A pet in the token list has its bonus overwritten with the base value by the game,
    // even when the cheat marks it upgraded - measured. So the two sets must stay disjoint.
    const currentPlusSet = () => (plusAll.val ? new Set(eligibleIds()) : new Set(plusIds.val));

    const handleToggle = async (companionId) => {
        if (isBusy()) return;

        const next = new Set(enabledIds.val);
        if (next.has(companionId)) next.delete(companionId);
        else next.add(companionId);

        if (next.has(companionId) && isPlus(companionId)) {
            const plus = currentPlusSet();
            plus.delete(companionId);
            await writePlus(plus);
        }
        await writeTokens(next);
    };

    const handleTogglePlus = async (companionId) => {
        if (isBusy()) return;

        const next = currentPlusSet();
        if (next.has(companionId)) next.delete(companionId);
        else next.add(companionId);

        if (next.has(companionId) && enabledIds.val.has(companionId)) {
            const tokens = new Set(enabledIds.val);
            tokens.delete(companionId);
            await writeTokens(tokens);
        }
        await writePlus(next);
    };

    const handleBulkWrite = async (ids) => {
        if (isBusy()) return;
        await writeTokens(new Set(ids.filter((id) => !isPlus(id))));
    };

    // The token list is a saved account value the game and other devices also write, so an
    // overlap can appear without this tab doing anything. Surface it rather than claim it
    // cannot happen.
    const overlapIds = () => [...enabledIds.val].filter((id) => isPlus(id));

    const handleFixOverlap = async () => {
        if (isBusy()) return;
        await writeTokens(new Set([...enabledIds.val].filter((id) => !isPlus(id))));
    };

    load();

    const renderSearchResults = () => {
        const companionMap = new Map(companions.val.map((companion) => [companion.id, companion]));
        const query = normalizeSearchText(searchQuery.val);
        const matchesFilters = (companion) => {
            if (!companion) return false;
            if (hideUnused.val && companion.isUnused) return false;
            if (!query) return true;
            return (
                normalizeSearchText(companion.name).includes(query) ||
                normalizeSearchText(companion.effect).includes(query)
            );
        };
        const visibleSections = sections.val
            .map((section) => ({
                ...section,
                companions: section.ids.map((id) => companionMap.get(id)).filter(matchesFilters),
            }))
            .filter((section) => section.companions.length > 0);

        if (!visibleSections.length) {
            return EmptyState({
                icon: Icons.SearchX(),
                title: "NO MATCHING PETS",
                subtitle: query
                    ? "No pets matched your current search."
                    : "No pets remain after the current filters were applied.",
            });
        }

        return div(
            ...visibleSections.map((section) =>
                div(
                    { class: "companions-section" },
                    div({ class: "companions-section__title" }, section.label),
                    div(
                        { class: "companions-grid" },
                        ...section.companions.map((companion) =>
                            CompanionCard({
                                companion,
                                enabledIds,
                                isPlus,
                                onToggle: handleToggle,
                                onTogglePlus: handleTogglePlus,
                            })
                        )
                    )
                )
            )
        );
    };

    const subNav = div(
        { class: "control-bar sticky-header" },
        SearchBar({
            placeholder: "SEARCH PETS OR BUFFS",
            onInput: (value) => (searchQuery.val = value),
        }),
        withTooltip(
            label(
                { class: "toggle-switch account-toggle" },
                input({
                    type: "checkbox",
                    checked: () => hideUnused.val,
                    onchange: (e) => (hideUnused.val = e.target.checked),
                }),
                span({ class: "slider" }),
                span({ class: "label" }, "HIDE UNUSED")
            ),
            "Hide pets that are not part of the official in-game pet groups."
        ),
        withTooltip(
            button(
                { class: "btn-secondary", onclick: () => handleBulkWrite(eligibleIds()), disabled: () => isBusy() },
                "UNLOCK ALL"
            ),
            "Activate the bonus of every available pet."
        ),
        withTooltip(
            button({ class: "btn-secondary", onclick: () => handleBulkWrite([]), disabled: () => isBusy() }, "CLEAR ALL"),
            "Deactivate all pet bonuses."
        ),
        withTooltip(
            button(
                { class: "btn-secondary", onclick: () => writePlus(new Set()), disabled: () => isBusy() },
                "CLEAR PETS+"
            ),
            "Drop every pet back to its normal tier and turn the W1 Companion cheat off."
        )
    );

    const renderNotices = () => {
        const overlap = overlapIds();
        if (!plusAll.val && !overlap.length) return null;
        return div(
            plusAll.val
                ? WarningBanner(
                      "Every pet is on the Pets+ tier: the W1 Companion cheat is on with an empty pet list. " +
                          "Click + on a pet to switch to picking them individually."
                  )
                : null,
            overlap.length
                ? WarningBanner(
                      `${overlap.length} pet${overlap.length === 1 ? " is" : "s are"} in both the pet-token list and Pets+. ` +
                          "The game overwrites Pets+ with the normal bonus for those, so they are not actually upgraded.",
                      button(
                          {
                              type: "button",
                              class: "btn-secondary",
                              onclick: handleFixOverlap,
                              disabled: () => isBusy(),
                          },
                          "REMOVE THEIR TOKENS"
                      )
                  )
                : null
        );
    };

    return PersistentAccountListPage({
        rootClass: "tab-container",
        title: "PETS",
        description:
            "Left click toggles a pet's account-wide bonus (pet token) - saved to your account, works without the injector. " +
            "The + button puts a pet on the Pets+ tier instead: that runs through the W1 Companion cheat, so it only lasts " +
            "while the injector is running, it changes your active follower, and a pet cannot be on a token and on Pets+ at once.",
        actions: RefreshButton({ onRefresh: load, tooltip: "Re-read live companion data from the running game." }),
        topNotices: () => renderNotices(),
        subNav,
        state: { loading, error },
        loadingText: "READING PETS",
        errorTitle: "PET READ FAILED",
        body: div({ class: "scrollable-panel companions-scroll" }, () => renderSearchResults()),
    });
};
