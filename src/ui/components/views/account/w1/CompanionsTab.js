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
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { EmptyState } from "../../../EmptyState.js";
import { SearchBar } from "../../../SearchBar.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { useWriteStatus, writeVerified } from "../accountShared.js";

const { div, button, span, label, input } = van.tags;

const TOKEN_PATH = "OptionsListAccount[606]";

const normalizeSearchText = (value) => String(value ?? "").trim().toLowerCase();

const isUnusedPetText = (value) => {
    const text = normalizeSearchText(value);
    return text.includes("not officially in the game") && text.includes("may never be");
};

const cleanText = (value, fallback = "") => {
    const text = String(value ?? fallback)
        .replace(/_/g, " ")
        .replace(/^\{+\s*/, "")
        .trim();
    return text || fallback;
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
            const name = cleanText(rawMonsterDefs?.[monsterKey]?.Name, "");
            if (!name) return null;

            const effect = cleanText(row[1], "No buff text");

            return { id, monsterKey, name, effect, isUnused: isUnusedPetText(effect) };
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

const CompanionCard = ({ companion, enabledIds, activeWriteId, writeStatus, onToggle }) =>
    button(
        {
            type: "button",
            class: () =>
                [
                    "companion-card",
                    enabledIds.val.has(companion.id) && "companion-card--enabled",
                    activeWriteId.val === companion.id && writeStatus.val === "loading" && "companion-card--loading",
                ]
                    .filter(Boolean)
                    .join(" "),
            "aria-pressed": () => enabledIds.val.has(companion.id),
            onclick: () => onToggle(companion.id),
            title: "Click: toggle this pet's account bonus.",
        },
        div(
            { class: "companion-card__top" },
            div({ class: "companion-card__name" }, companion.name),
            span({ class: "companion-card__id" }, `ID ${companion.id}`)
        ),
        div({ class: "companion-card__effect" }, companion.effect)
    );

export const CompanionsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Pets" });
    const { status: writeStatus, run: runWrite } = useWriteStatus();

    const companions = van.state([]);
    const sections = van.state([]);
    const validIds = van.state([]);
    const enabledIds = van.state(new Set());
    const activeWriteId = van.state(null);
    const hideUnused = van.state(false);
    const searchQuery = van.state("");

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
            const nextValidIds = nextCompanions.map((companion) => companion.id);
            const validIdSet = new Set(nextValidIds);

            companions.val = nextCompanions;
            sections.val = buildSections(nextCompanions, rawSetsInfo);
            validIds.val = nextValidIds;

            const tokenValue = await gga(TOKEN_PATH);
            enabledIds.val = new Set(parseIdList(tokenValue).filter((id) => validIdSet.has(id)));
        });

    const writeTokens = (idSet) =>
        runWrite(async () => {
            await writeVerified(TOKEN_PATH, serializeIds(idSet));
            enabledIds.val = idSet;
        });

    const isBusy = () => loading.val || activeWriteId.val !== null || writeStatus.val === "loading";

    const handleToggle = async (companionId) => {
        if (isBusy()) return;
        activeWriteId.val = companionId;

        try {
            const next = new Set(enabledIds.val);
            if (next.has(companionId)) next.delete(companionId);
            else next.add(companionId);

            await writeTokens(next);
        } finally {
            activeWriteId.val = null;
        }
    };

    const handleBulkWrite = async (ids) => {
        if (isBusy()) return;
        await writeTokens(new Set(ids));
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
                            CompanionCard({ companion, enabledIds, activeWriteId, writeStatus, onToggle: handleToggle })
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
        )
    );

    return PersistentAccountListPage({
        rootClass: "tab-container",
        title: "PETS",
        description: "Left click toggles a pet's account-wide bonus (pet token). Writes bypass the in-game token limit.",
        actions: RefreshButton({ onRefresh: load, tooltip: "Re-read live companion data from the running game." }),
        subNav,
        state: { loading, error },
        loadingText: "READING PETS",
        errorTitle: "PET READ FAILED",
        body: div({ class: "scrollable-panel companions-scroll" }, () => renderSearchResults()),
    });
};
