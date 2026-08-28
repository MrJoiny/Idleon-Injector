/**
 * Deathbringer Grimoire editor.
 *
 * Data sources:
 *   gga.Grimoire                         - current upgrade levels
 *   gga.CustomLists.h.GrimoireUpg[n][0] - upgrade name
 *   gga.CustomLists.h.GrimoireUpg[n][4] - defined maximum level
 *   gga.OptionsListAccount[329]          - total bones collected
 *   gga.OptionsListAccount[330..333]     - Femur, Ribcage, Cranium, Bovinae
 *   gga.OptionsListAccount[367]          - Charred Bones AFK toggle
 */

import van from "../../../../vendor/van-1.6.0.js";
import { EmptyState } from "../../../EmptyState.js";
import { SearchBar } from "../../../SearchBar.js";
import { Icons } from "../../../../assets/icons.js";
import { deleteGga, gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountToggleRow } from "../components/AccountToggleRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { InlineEditableNumberField } from "../components/InlineEditableNumberField.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    getOrCreateState,
    runBulkSet,
    toInt,
    toNum,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const GRIMOIRE_PATH = "Grimoire";
const GRIMOIRE_DEFINITIONS_PATH = "GrimoireUpg";
const GRIMOIRE_TOTAL_LEVEL_CACHE_PATH = "DNSM.h.GrimoireTotLV";
const AFK_BONES_OPTION = 367;

const BONE_FIELDS = [
    { key: "femur", optionIndex: 330, name: "FEMUR" },
    { key: "ribcage", optionIndex: 331, name: "RIBCAGE" },
    { key: "total", optionIndex: 329, name: "TOTAL BONES COLLECTED" },
    { key: "cranium", optionIndex: 332, name: "CRANIUM" },
    { key: "bovinae", optionIndex: 333, name: "BOVINAE" },
];

const toCurrency = (value) => Math.max(0, toNum(value, 0));

/** Remove unresolved in-game tooltip markers from an upgrade's display name. */
const cleanGrimoireName = (rawName, index) => {
    const name = cleanName(rawName, "")
        .split(/[\u3400-\u9fff(（]/, 1)[0]
        .trim();
    return name || `Grimoire Upgrade ${index + 1}`;
};

/**
 * Build only editable definitions. The definition table determines the set of
 * valid upgrades.
 */
const buildGrimoireUpgrades = (rawDefinitions) =>
    toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[0] ?? "").trim();
            const maxLevel = toInt(definition[4], { min: 0 });
            if (!rawName || !maxLevel) return null;

            return {
                index,
                name: cleanGrimoireName(rawName, index),
                maxLevel,
            };
        })
        .filter(Boolean);

const matchesSearch = (upgrade, query) => {
    const search = String(query ?? "")
        .trim()
        .toLowerCase();
    if (!search) return true;

    return (
        upgrade.name.toLowerCase().includes(search) ||
        String(upgrade.index).includes(search) ||
        `#${upgrade.index}`.includes(search)
    );
};

const GrimoireRow = ({ upgrade, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        max: upgrade.maxLevel,
        integerMode: "trunc",
        maxAction: {
            label: "MAX",
            value: upgrade.maxLevel,
            tooltip: `Set ${upgrade.name} to level ${upgrade.maxLevel}`,
        },
        write: async (nextLevel) => {
            await writeVerified(`${GRIMOIRE_PATH}[${upgrade.index}]`, nextLevel);
            await deleteGga(GRIMOIRE_TOTAL_LEVEL_CACHE_PATH);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${upgrade.index}`),
            span({ class: "account-row__name" }, upgrade.name),
        ],
        renderBadge: (level) => `LV ${level ?? 0} / ${upgrade.maxLevel}`,
        rowClass: "grimoire-row",
        badgeClass: "grimoire-row__level",
        controlsClass: "grimoire-row__controls",
    });

const BoneCurrencySection = ({ boneStates, afkBonesEnabled }) =>
    AccountSection({
        title: "BONE CURRENCY",
        body: [
            div(
                { class: "grimoire-currency__fields" },
                ...BONE_FIELDS.map((field) =>
                    InlineEditableNumberField({
                        label: field.name,
                        valueState: boneStates.get(field.key),
                        path: `OptionsListAccount[${field.optionIndex}]`,
                        rootClass: "grimoire-currency__field",
                        labelClass: "grimoire-currency__label",
                        inputClass: "grimoire-currency__set",
                    })
                ),
                AccountToggleRow({
                    info: div(
                        { class: "account-row__name-group" },
                        span({ class: "account-row__name" }, "AFK BONE BONUS")
                    ),
                    badge: () => (afkBonesEnabled.val ? "ENABLED" : "DISABLED"),
                    checked: () => Boolean(afkBonesEnabled.val),
                    rowClass: "grimoire-currency__toggle",
                    title: "Enable or disable Charred Bones for AFK Deathbringer.",
                    write: async (enabled) => {
                        const nextValue = enabled ? 1 : 0;
                        await writeVerified(`OptionsListAccount[${AFK_BONES_OPTION}]`, nextValue);
                        afkBonesEnabled.val = nextValue;
                    },
                })
            ),
        ],
    });

export const GrimoireTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Grimoire" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const upgrades = van.state([]);
    const searchQuery = van.state("");
    const boneStates = new Map(BONE_FIELDS.map((field) => [field.key, van.state(0)]));
    const afkBonesEnabled = van.state(0);
    const levelStates = new Map();
    const rowNodes = new Map();
    const upgradeRows = div({ class: "account-item-stack account-item-stack--dense grimoire-upgrade-list" });
    const noUpgrades = EmptyState({
        icon: Icons.SearchX(),
        title: "NO GRIMOIRE UPGRADES",
        subtitle: "No valid Grimoire definitions were returned by the running game.",
    });
    const upgradeContent = div();
    let definitionSignature = null;

    const refreshRows = () => {
        const visibleRows = upgrades.val.filter((upgrade) => matchesSearch(upgrade, searchQuery.val));
        upgradeRows.replaceChildren(...visibleRows.map((upgrade) => rowNodes.get(upgrade.index)));
        upgradeContent.replaceChildren(upgrades.val.length ? upgradeRows : noUpgrades);
    };

    const rebuildRows = (nextUpgrades) => {
        const nextSignature = nextUpgrades
            .map((upgrade) => `${upgrade.index}:${upgrade.name}:${upgrade.maxLevel}`)
            .join("|");
        if (definitionSignature === nextSignature) return;

        definitionSignature = nextSignature;
        rowNodes.clear();
        nextUpgrades.forEach((upgrade) => {
            rowNodes.set(
                upgrade.index,
                GrimoireRow({
                    upgrade,
                    levelState: getOrCreateState(levelStates, upgrade.index),
                })
            );
        });
    };

    van.derive(() => {
        upgrades.val;
        searchQuery.val;
        refreshRows();
    });

    const load = () =>
        runLoad(async () => {
            const optionIndexes = [...BONE_FIELDS.map((field) => String(field.optionIndex)), String(AFK_BONES_OPTION)];
            const [rawLevels, rawDefinitions, rawOptions] = await Promise.all([
                gga(GRIMOIRE_PATH),
                readCList(GRIMOIRE_DEFINITIONS_PATH),
                readGgaEntries("OptionsListAccount", optionIndexes),
            ]);
            const nextUpgrades = buildGrimoireUpgrades(rawDefinitions);
            const levels = toIndexedArray(rawLevels ?? []);

            rebuildRows(nextUpgrades);
            nextUpgrades.forEach((upgrade) => {
                getOrCreateState(levelStates, upgrade.index).val = Math.min(
                    upgrade.maxLevel,
                    toInt(levels[upgrade.index], { min: 0 })
                );
            });

            BONE_FIELDS.forEach((field) => {
                boneStates.get(field.key).val = toCurrency(rawOptions?.[String(field.optionIndex)]);
            });
            afkBonesEnabled.val = toCurrency(rawOptions?.[String(AFK_BONES_OPTION)]) ? 1 : 0;
            upgrades.val = nextUpgrades;
        });

    const runBulkAction = async (mode) => {
        const currentUpgrades = upgrades.val;
        if (!currentUpgrades.length || bulkStatus.val === "loading") return;

        const result = await runBulk(async () => {
            try {
                await runBulkSet({
                    entries: currentUpgrades,
                    getTargetValue: (upgrade) => (mode === "max" ? upgrade.maxLevel : 0),
                    getValueState: (upgrade) => getOrCreateState(levelStates, upgrade.index),
                    getPath: (upgrade) => `${GRIMOIRE_PATH}[${upgrade.index}]`,
                });
            } finally {
                await deleteGga(GRIMOIRE_TOTAL_LEVEL_CACHE_PATH);
            }
        });

        if (!result.ok) await load();
    };

    load();

    const body = div(
        { class: "grimoire-scroll scrollable-panel" },
        BoneCurrencySection({ boneStates, afkBonesEnabled }),
        upgradeContent
    );

    const subNav = div(
        { class: "control-bar sticky-header grimoire-controls" },
        SearchBar({
            placeholder: "SEARCH GRIMOIRE OR INDEX",
            value: searchQuery,
            debounceMs: 0,
            onInput: (value) => (searchQuery.val = value),
        })
    );

    return PersistentAccountListPage({
        title: "GRIMOIRE",
        description: "Manage Deathbringer Grimoire upgrades and Bone Currency.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    disabled: () => loading.val || bulkStatus.val === "loading",
                    tooltip: "Set every Grimoire upgrade to its defined maximum level.",
                    onClick: () => runBulkAction("max"),
                },
                {
                    label: "RESET ALL",
                    status: bulkStatus,
                    variant: "danger",
                    disabled: () => loading.val || bulkStatus.val === "loading",
                    tooltip: "Reset every Grimoire upgrade to level 0.",
                    onClick: () => runBulkAction("reset"),
                },
            ],
            refresh: {
                onClick: load,
                tooltip: "Re-read Grimoire levels, Bone Currency, and definitions from the running game.",
                disabled: () => loading.val || bulkStatus.val === "loading",
            },
        }),
        state: { loading, error },
        subNav,
        loadingText: "READING GRIMOIRE",
        errorTitle: "GRIMOIRE READ FAILED",
        initialWrapperClass: "grimoire-scroll",
        body,
    });
};
