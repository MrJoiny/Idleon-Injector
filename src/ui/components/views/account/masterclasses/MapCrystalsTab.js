import van from "../../../../vendor/van-1.6.0.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { SearchBar } from "../../../SearchBar.js";
import { deleteGga, gga } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { EditableFieldsRow, StackedNumberField } from "../EditableFieldsRow.js";
import { renderTabNav } from "../tabShared.js";
import { cleanName, resolveNumberInput, toInt, useWriteStatus, writeManyVerified } from "../accountShared.js";

const { div, span } = van.tags;

const WORLD_TABS = [
    { id: "all", label: "ALL" },
    { id: "w1", label: "W1" },
    { id: "w2", label: "W2" },
    { id: "w3", label: "W3" },
    { id: "w4", label: "W4" },
    { id: "w5", label: "W5" },
    { id: "w6", label: "W6" },
    { id: "w7", label: "W7" },
];

/** Calculate Arcane crystal stat multiplier (%) given kill count. */
const calculateArcaneCrystalBonus = (kills) => {
    const k = Number(kills);
    if (!Number.isFinite(k) || k < 1) return 0;
    const log10 = Math.log10(k);
    const log2 = Math.log2(k);
    const val =
        (2 * Math.max(0, log10 - 3.5) + Math.max(0, log2 - 12)) * (log10 / 2.5) +
        (Math.min(2, k / 1000) + Math.max(5 * (log10 - 5), 0));
    return Math.max(0, Math.round(val * 10) / 10);
};

/** Calculate Arcane crystal stat multiplier (e.g. 1.631) matching in-game AFK screen format. */
const calculateArcaneCrystalMultiplier = (kills, capPercent = null) => {
    let bonus = calculateArcaneCrystalBonus(kills);
    if (capPercent !== null && capPercent > 0 && bonus > capPercent) {
        bonus = capPercent;
    }
    const mult = Math.floor(1000 * (1 + bonus / 100)) / 1000;
    return mult.toFixed(3);
};

const resolveWorldKey = (mapIndex, targetMob, deathNoteMobs) => {
    if (targetMob && deathNoteMobs) {
        for (let w = 0; w < deathNoteMobs.length; w++) {
            const mobs = deathNoteMobs[w];
            if (Array.isArray(mobs) && mobs.includes(targetMob)) {
                return `W${w + 1}`;
            }
        }
    }

    if (mapIndex === 37) return "W2";
    if (mapIndex === 166) return "W4";
    const worldNum = Math.min(7, Math.max(1, Math.floor(mapIndex / 50) + 1));
    return `W${worldNum}`;
};

const MapCrystalRow = ({ map, states, talentCap }) => {
    const { purple: purpleState, yellow: yellowState, blue: blueState } = states;

    const fields = [
        {
            key: "purple",
            label: "Purple (Drop Rate)",
            valueState: purpleState,
            formatted: true,
            rootClass: "account-stacked-field",
            labelClass: "account-stacked-field__label",
        },
        {
            key: "yellow",
            label: "Yellow (EXP)",
            valueState: yellowState,
            formatted: true,
            rootClass: "account-stacked-field",
            labelClass: "account-stacked-field__label",
        },
        {
            key: "blue",
            label: "Blue (AFK)",
            valueState: blueState,
            formatted: true,
            rootClass: "account-stacked-field",
            labelClass: "account-stacked-field__label",
        },
    ];

    const formatBadge = () => {
        const pRaw = calculateArcaneCrystalBonus(purpleState.val);
        const yRaw = calculateArcaneCrystalBonus(yellowState.val);
        const bRaw = calculateArcaneCrystalBonus(blueState.val);

        if (pRaw === 0 && yRaw === 0 && bRaw === 0) return "1.000x (+0%)";

        const cap = talentCap ? talentCap.val : null;
        const isCapped = (raw) => cap !== null && cap > 0 && raw > cap;

        const pMult = calculateArcaneCrystalMultiplier(purpleState.val, cap);
        const yMult = calculateArcaneCrystalMultiplier(yellowState.val, cap);
        const bMult = calculateArcaneCrystalMultiplier(blueState.val, cap);

        const anyCapped = isCapped(pRaw) || isCapped(yRaw) || isCapped(bRaw);

        if (purpleState.val === yellowState.val && yellowState.val === blueState.val) {
            const rawMult = calculateArcaneCrystalMultiplier(purpleState.val);
            if (anyCapped) {
                return `${pMult}x (Capped · Max ${rawMult}x / +${pRaw}%)`;
            }
            return `${pMult}x (+${pRaw}%)`;
        }

        const cappedSuffix = anyCapped ? " (Capped)" : "";
        return `${pMult}x DROP · ${yMult}x EXP · ${bMult}x AFK${cappedSuffix}`;
    };

    return EditableFieldsRow({
        fields,
        normalize: (rawValues) => {
            const purple = resolveNumberInput(rawValues.purple, { formatted: true, min: 0 });
            const yellow = resolveNumberInput(rawValues.yellow, { formatted: true, min: 0 });
            const blue = resolveNumberInput(rawValues.blue, { formatted: true, min: 0 });
            if (purple === null || yellow === null || blue === null) return null;
            return { purple, yellow, blue };
        },
        write: async ({ purple, yellow, blue }) => {
            await writeManyVerified([
                { path: `MapBon[${map.mapIndex}][0]`, value: purple },
                { path: `MapBon[${map.mapIndex}][1]`, value: yellow },
                { path: `MapBon[${map.mapIndex}][2]`, value: blue },
            ]);
            try {
                await deleteGga("DNSM.h.ArcMultBon");
            } catch {
                /* non-fatal if DNSM does not exist */
            }
            return { purple, yellow, blue };
        },
        info: [
            span({ class: "account-row__index" }, `#${map.mapIndex}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, map.name)),
        ],
        badge: formatBadge,
        rowClass: "map-crystal-row account-row--wide-controls",
        badgeClass: "map-crystal-row__badge",
        controlsClass: "account-row__controls--stack-action map-crystal-row__controls",
        renderControls: ({ draftStates, resetDraft, setFieldFocused }) =>
            div(
                { class: "account-stacked-fields" },
                ...fields.map((field) => StackedNumberField({ field, draftStates, setFieldFocused, resetDraft }))
            ),
        renderExtraActions: ({ applyValue, status }) => [
            ActionButton({
                label: "10M",
                variant: "max-reset",
                status,
                tooltip: "Set all crystals for this map to 10,000,000 kills (1.631x / +63.1% bonus)",
                onClick: () => applyValue({ purple: 10000000, yellow: 10000000, blue: 10000000 }),
            }),
        ],
        applyTooltip: `Write crystal kill counts for ${map.name} to game memory`,
    });
};

export const MapCrystalsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Arcane Map Crystals" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();

    const activeTab = van.state(WORLD_TABS[0].id);
    const searchQuery = van.state("");
    const allMaps = van.state([]);
    const talentCap = van.state(null);
    const mapStateRegistry = new Map();
    const rowNodes = new Map();

    const getMapStates = (mapIndex) => {
        if (!mapStateRegistry.has(mapIndex)) {
            mapStateRegistry.set(mapIndex, {
                purple: van.state(0),
                yellow: van.state(0),
                blue: van.state(0),
            });
        }
        return mapStateRegistry.get(mapIndex);
    };

    const getMapRow = (map) => {
        if (!rowNodes.has(map.mapIndex)) {
            rowNodes.set(
                map.mapIndex,
                MapCrystalRow({ map, states: getMapStates(map.mapIndex), talentCap })
            );
        }
        return rowNodes.get(map.mapIndex);
    };

    const load = async () =>
        run(async () => {
            const [rawMapBon, rawMapDispNames, rawMapTargets, rawDeathNoteMobs, rawArcMultBon] = await Promise.all([
                gga("MapBon"),
                gga("CustomLists.h.MapDispName"),
                gga("CustomLists.h.MapAFKtarget"),
                gga("CustomLists.h.DeathNoteMobs"),
                gga("DNSM.h.ArcMultBon").catch(() => null),
            ]);

            const mapBon = toIndexedArray(rawMapBon ?? []);
            const mapDispNames = toIndexedArray(rawMapDispNames ?? []);
            const mapTargets = toIndexedArray(rawMapTargets ?? []);
            const deathNoteMobs = toIndexedArray(rawDeathNoteMobs ?? []).map((list) => toIndexedArray(list ?? []));

            const arcMultBon = toIndexedArray(rawArcMultBon ?? []);
            if (arcMultBon.length > 0 && Number.isFinite(Number(arcMultBon[0]))) {
                talentCap.val = Math.round(Number(arcMultBon[0]) * 100) / 100;
            } else {
                talentCap.val = null;
            }

            const discoveredMaps = [];

            for (let i = 0; i < mapBon.length; i++) {
                const bonEntry = toIndexedArray(mapBon[i] ?? []);
                if (bonEntry.length < 3) continue;

                const targetMob = mapTargets[i];
                const rawName = mapDispNames[i] ? String(mapDispNames[i]).replace(/_/g, " ") : `Map ${i}`;
                const clean = cleanName(rawName);
                if (!clean) continue;

                const worldKey = resolveWorldKey(i, targetMob, deathNoteMobs);

                discoveredMaps.push({
                    mapIndex: i,
                    name: clean,
                    worldKey,
                });

                const states = getMapStates(i);
                states.purple.val = toInt(bonEntry[0], { min: 0 });
                states.yellow.val = toInt(bonEntry[1], { min: 0 });
                states.blue.val = toInt(bonEntry[2], { min: 0 });
            }

            allMaps.val = discoveredMaps;
        });

    const applyBulkKills = async (mapsToUpdate, killCount) => {
        if (!mapsToUpdate || mapsToUpdate.length === 0) return;
        await runBulk(async () => {
            const writes = [];
            for (const map of mapsToUpdate) {
                const states = getMapStates(map.mapIndex);
                if (states.purple.val !== killCount) writes.push({ path: `MapBon[${map.mapIndex}][0]`, value: killCount });
                if (states.yellow.val !== killCount) writes.push({ path: `MapBon[${map.mapIndex}][1]`, value: killCount });
                if (states.blue.val !== killCount) writes.push({ path: `MapBon[${map.mapIndex}][2]`, value: killCount });
            }
            if (writes.length > 0) {
                const CHUNK_SIZE = 60;
                for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
                    await writeManyVerified(writes.slice(i, i + CHUNK_SIZE));
                }
            }
            try {
                await deleteGga("DNSM.h.ArcMultBon");
            } catch {
                /* non-fatal */
            }
            for (const map of mapsToUpdate) {
                const states = getMapStates(map.mapIndex);
                states.purple.val = killCount;
                states.yellow.val = killCount;
                states.blue.val = killCount;
            }
        });
    };

    const getActiveWorldMaps = () => {
        if (activeTab.val === "all") return allMaps.val;
        const targetWorld = activeTab.val.toUpperCase();
        return allMaps.val.filter((m) => m.worldKey === targetWorld);
    };

    load();

    const renderMapList = () => {
        const query = searchQuery.val.trim().toLowerCase();
        const worldMaps = getActiveWorldMaps();
        const visibleMaps = query
            ? worldMaps.filter(
                  (m) =>
                      m.name.toLowerCase().includes(query) ||
                      `#${m.mapIndex}`.includes(query)
              )
            : worldMaps;

        if (visibleMaps.length === 0) {
            return EmptyState({
                icon: Icons.SearchX(),
                title: "NO MAPS FOUND",
                subtitle: query ? "Adjust your search filter" : "No maps available for this world",
            });
        }

        return div(
            { class: "account-list map-crystals-list" },
            ...visibleMaps.map((map) => getMapRow(map))
        );
    };

    const bulkActions = [
        {
            label: "SET WORLD TO 10M",
            status: bulkStatus,
            disabled: () => loading.val || activeTab.val === "all",
            tooltip: "Set all crystals on maps in the current world view to 10M kills (1.631x / +63.1% bonus)",
            onClick: () => {
                if (activeTab.val === "all") return;
                applyBulkKills(getActiveWorldMaps(), 10000000);
            },
        },
        {
            label: "SET ALL TO 10M",
            status: bulkStatus,
            disabled: () => loading.val,
            tooltip: "Set all crystals across all worlds to 10M kills (1.631x / +63.1% bonus)",
            onClick: () => applyBulkKills(allMaps.val, 10000000),
        },
        {
            label: "CLEAR WORLD (0)",
            status: bulkStatus,
            disabled: () => loading.val || activeTab.val === "all",
            tooltip: "Reset all crystals on maps in the current world view to 0 kills (select a specific world tab to enable)",
            onClick: () => {
                if (activeTab.val === "all") return;
                applyBulkKills(getActiveWorldMaps(), 0);
            },
        },
    ];

    const body = div(
        { class: "map-crystals-container" },
        div(
            { class: "map-crystals-search-bar" },
            SearchBar({
                placeholder: "SEARCH MAPS OR INDEX",
                value: searchQuery,
                onInput: (val) => (searchQuery.val = val),
            })
        ),
        () => renderMapList()
    );

    return PersistentAccountListPage({
        rootClass: "tab-container",
        wrapActions: false,
        title: "MAP CRYSTALS",
        description: () => {
            const base =
                "Edit Arcane Cultist crystal kill progression (Purple: Drop Rate, Yellow: EXP, Blue: AFK). In-game displays values as a total multiplier.";
            if (talentCap.val !== null && talentCap.val > 0) {
                const capMult = (Math.floor(1000 * (1 + talentCap.val / 100)) / 1000).toFixed(3);
                return `${base} Talent 589 cap: ${capMult}x (+${talentCap.val}%).`;
            }
            return base;
        },
        actions: BulkActionBar({
            actions: bulkActions,
            refresh: {
                onClick: load,
                disabled: () => loading.val,
                tooltip: "Re-read map crystal data from game memory",
            },
        }),
        subNav: renderTabNav({
            tabs: WORLD_TABS,
            activeId: activeTab,
            navClass: "account-page-nav",
            buttonClass: "account-page-btn",
        }),
        state: { loading, error },
        loadingText: "READING MAP CRYSTALS",
        errorTitle: "MAP CRYSTAL READ FAILED",
        initialWrapperClass: "map-crystals-container",
        body,
    });
};
