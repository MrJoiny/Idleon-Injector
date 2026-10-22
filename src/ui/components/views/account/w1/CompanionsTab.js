/**
 * W1 - Pets Tab
 *
 * Companion definitions come from live game data:
 *   cList.CompanionDB
 *   cList.CompanionSetsInfo
 *   MonsterDefinitionsGET.h[monsterKey].Name
 *
 * Tier selections use the W1 Companion cheat and only apply while it is running.
 */

import van from "../../../../vendor/van-1.6.0.js";
import {
    executeCheatAction,
    fetchCheatStates,
    fetchConfig,
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
import { cleanName, cleanNameEffect, useWriteStatus } from "../accountShared.js";

const { div, button, span, label, input } = van.tags;

const PLUS_WARNINGS = {
    27: "Pets+ breaks the Gold Ball Shop bonus: it drops to 1x instead of 2x. Keep this pet normal to retain the bonus.",
    30: "Pets+ breaks remote chest access and infinite teleports unless another pet, such as Ram, provides them. Keep this pet normal to retain these perks.",
    88: "Pets+ can prevent the Prisma multiplier and extra Prisma Bubble unlock from activating. Keep this pet normal until the game fixes its tier checks.",
};

// Empty config means all Pets+. Bare IDs and legacy arrays keep their existing tiers.
const parsePlusIds = (value) => {
    if (!Array.isArray(value)) {
        return String(value ?? "")
            .split(",")
            .filter((entry) => entry.trim().split(":")[1] !== "0")
            .map((entry) => Number.parseInt(entry, 10))
            .filter((id) => Number.isFinite(id));
    }
    // Hand-written array form: "<id>,a,b,c,<tier>" - only tier 1 counts as Pets+.
    return value
        .map((entry) => {
            const parts = String(entry).split(",");
            if (parts.length > 4 && parts[4].trim() !== "1") return Number.NaN;
            return Number.parseInt(parts[0], 10);
        })
        .filter((id) => Number.isFinite(id));
};

const normalizeSearchText = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase();

const isUnusedPetText = (value) => {
    const text = normalizeSearchText(value);
    return text.includes("not officially in the game") && text.includes("may never be");
};

const parseIdList = (value) =>
    String(value ?? "")
        .split(",")
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((id) => Number.isFinite(id));

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

const CompanionCard = ({ companion, normalIds, isPlus, isBusy, onToggle, onTogglePlus }) =>
    div(
        { class: "companion-card-wrap" },
        button(
            {
                type: "button",
                class: () =>
                    [
                        "companion-card",
                        normalIds.val.has(companion.id) && "companion-card--enabled",
                        isPlus(companion.id) && "companion-card--plus",
                    ]
                        .filter(Boolean)
                        .join(" "),
                "aria-pressed": () => normalIds.val.has(companion.id),
                disabled: () => isBusy(),
                onclick: () => onToggle(companion.id),
                title: "Toggle this pet's normal bonus.",
            },
            div(
                { class: "companion-card__top" },
                div({ class: "companion-card__name" }, companion.name),
                span({ class: "companion-card__id" }, `ID ${companion.id}`)
            ),
            span({ class: "companion-card__tier" }, () =>
                isPlus(companion.id) ? "PETS+" : normalIds.val.has(companion.id) ? "NORMAL" : "NOT SELECTED"
            ),
            div({ class: "companion-card__effect" }, () =>
                isPlus(companion.id) ? companion.plusEffect : companion.effect
            ),
            PLUS_WARNINGS[companion.id] ? div({ class: "companion-card__warning" }, PLUS_WARNINGS[companion.id]) : null
        ),
        withTooltip(
            button(
                {
                    type: "button",
                    class: () =>
                        ["companion-plus", isPlus(companion.id) && "companion-plus--on"].filter(Boolean).join(" "),
                    "aria-pressed": () => isPlus(companion.id),
                    "aria-label": `Pets+ tier for ${companion.name}`,
                    disabled: () => isBusy(),
                    onclick: () => onTogglePlus(companion.id),
                },
                "+"
            ),
            "Toggle this pet's Pets+ bonus."
        )
    );

export const CompanionsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Pets" });
    const { status: writeStatus, run: runWrite } = useWriteStatus();

    const companions = van.state([]);
    const sections = van.state([]);
    const normalIds = van.state(new Set());
    const plusIds = van.state(new Set());
    const cheatEnabled = van.state(false);
    const writeError = van.state("");
    const hideUnused = van.state(false);
    const searchQuery = van.state("");

    const isPlus = (id) => plusIds.val.has(id);

    const load = () =>
        runLoad(async () => {
            const [rawCompanionDb, rawSetsInfo] = await Promise.all([
                readCList("CompanionDB"),
                readCList("CompanionSetsInfo"),
            ]);
            const monsterKeys = [
                ...new Set(
                    toIndexedArray(rawCompanionDb)
                        .map((entry) => toIndexedArray(entry)[0])
                        .filter(Boolean)
                ),
            ];
            const monsterDefs = monsterKeys.length
                ? await readGgaEntries("MonsterDefinitionsGET.h", monsterKeys, ["Name"])
                : {};

            const nextCompanions = buildCompanionRows(rawCompanionDb, monsterDefs);
            const validIdSet = new Set(nextCompanions.map((companion) => companion.id));

            companions.val = nextCompanions;
            sections.val = buildSections(nextCompanions, rawSetsInfo);

            const [config, cheatStates] = await Promise.all([fetchConfig(), fetchCheatStates()]);
            cheatEnabled.val = !!cheatStates?.data?.w1?.companion;
            const configured = config?.cheatConfig?.w1?.companion?.companions ?? "";
            plusIds.val = new Set(
                (cheatEnabled.val ? (configured ? parsePlusIds(configured) : [...validIdSet]) : []).filter((id) =>
                    validIdSet.has(id)
                )
            );
            const selectedIds = Array.isArray(configured)
                ? configured.map((entry) => Number.parseInt(String(entry), 10))
                : parseIdList(configured);
            normalIds.val = new Set(
                cheatEnabled.val ? selectedIds.filter((id) => validIdSet.has(id) && !plusIds.val.has(id)) : []
            );
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

    const writeSelection = (normal, plus) =>
        runWrite(
            async () => {
                writeError.val = "";
                if (error.val || !companions.val.length) throw new Error("Refresh pet data before changing tiers");
                const entries = companions.val
                    .filter(({ id }) => normal.has(id) || plus.has(id))
                    .map(({ id }) => `${id}:${plus.has(id) ? 1 : 0}`);
                const result = await updateSessionConfig({
                    cheatConfig: { w1: { companion: { companions: entries.join(",") } } },
                });
                if (result.message !== "Configuration updated successfully") {
                    throw new Error(result.details || result.message || "Could not apply pet tiers in game");
                }
                await setCompanionCheat(entries.length > 0);
                cheatEnabled.val = entries.length > 0;
                normalIds.val = normal;
                plusIds.val = plus;
                await persistConfig();
            },
            {
                onError: (error) => {
                    writeError.val = error.message;
                },
            }
        );

    const isBusy = () => loading.val || writeStatus.val === "loading";

    const handleToggle = async (companionId) => {
        if (isBusy()) return;
        const normal = new Set(normalIds.val);
        const plus = new Set(plusIds.val);
        if (normal.has(companionId)) normal.delete(companionId);
        else normal.add(companionId);
        plus.delete(companionId);
        await writeSelection(normal, plus);
    };

    const handleTogglePlus = async (companionId) => {
        if (isBusy()) return;

        const next = new Set(plusIds.val);
        if (next.has(companionId)) next.delete(companionId);
        else next.add(companionId);
        const normal = new Set(normalIds.val);
        normal.delete(companionId);
        await writeSelection(normal, next);
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
                                normalIds,
                                isPlus,
                                isBusy,
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
                {
                    class: "btn-secondary",
                    disabled: () => isBusy(),
                    onclick: () =>
                        writeSelection(
                            new Set(
                                companions.val.filter((pet) => !pet.isUnused && !isPlus(pet.id)).map((pet) => pet.id)
                            ),
                            new Set(plusIds.val)
                        ),
                },
                "UNLOCK ALL"
            ),
            "Select all available pets at their normal tier, keeping existing Pets+ choices."
        ),
        withTooltip(
            button(
                {
                    class: "btn-secondary",
                    disabled: () => isBusy(),
                    onclick: () =>
                        writeSelection(
                            new Set(),
                            new Set(companions.val.filter((pet) => !pet.isUnused).map((pet) => pet.id))
                        ),
                },
                "UNLOCK ALL PETS+"
            ),
            "Select all available pets at Pets+, including pets with warnings about broken perks."
        ),
        withTooltip(
            button(
                {
                    class: "btn-secondary",
                    disabled: () => isBusy(),
                    onclick: () => writeSelection(new Set(), new Set()),
                },
                "CLEAR ALL"
            ),
            "Clear all injector pet selections and turn the W1 Companion cheat off."
        ),
        withTooltip(
            button(
                {
                    class: "btn-secondary",
                    onclick: () => writeSelection(new Set(normalIds.val), new Set()),
                    disabled: () => isBusy(),
                },
                "CLEAR PETS+"
            ),
            "Clear Pets+ selections, keeping normal selections."
        )
    );

    return PersistentAccountListPage({
        rootClass: "tab-container",
        title: "PETS",
        description: "Click a card for Normal or + for Pets+. Click again to deselect.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: isBusy,
            tooltip: "Re-read live companion data from the running game.",
        }),
        topNotices: () =>
            div(
                WarningBanner(
                    "Since the latest game update, pets unlocked here are only available while the injector is running. " +
                        "Pets you own remain available."
                ),
                writeError.val ? WarningBanner(span({ role: "alert" }, writeError.val)) : null,
                !loading.val && !error.val && !cheatEnabled.val
                    ? WarningBanner("The W1 Companion cheat is off. Select a pet's normal or Pets+ bonus to enable it.")
                    : null
            ),
        subNav,
        state: { loading, error },
        loadingText: "READING PETS",
        errorTitle: "PET READ FAILED",
        body: div(
            { class: "scrollable-panel companions-scroll", "aria-busy": () => writeStatus.val === "loading" },
            () => renderSearchResults()
        ),
    });
};
