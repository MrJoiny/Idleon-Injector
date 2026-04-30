import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readComputed, readGgaEntries } from "../../../../../services/api.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { ActionButton } from "../../components/ActionButton.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createIndexedStateGetter,
    createStaticRowReconciler,
    readLevelDefinitions,
    runBulkSet,
    toInt,
    useWriteStatus,
} from "../../accountShared.js";

const { div } = van.tags;

const BREEDING_EGGS_PATH = "Breeding[0]";
const BREEDING_UPGRADES_PATH = "Breeding[2]";
const ARENA_ROUND_PATH = "OptionsListAccount[89]";
const SPICE_CLAIM_PATH = "OptionsListAccount[100]";
const EGG_MAX_RARITY = 11;
const spacedActionGroup = (...actions) => div({ class: "account-header__actions" }, ...actions);

const buildEggEntries = (rawEggs, capacity) =>
    Array.from({ length: Math.max(0, toInt(capacity, { min: 0 })) }, (_, index) => ({
        index,
        key: `egg:${index}`,
        name: `Egg ${index + 1}`,
        path: `${BREEDING_EGGS_PATH}[${index}]`,
        value: Math.min(EGG_MAX_RARITY, toInt(rawEggs?.[index], { min: 0 })),
        max: EGG_MAX_RARITY,
        formatted: false,
        badge: (currentValue) => `${currentValue ?? 0} / ${EGG_MAX_RARITY}`,
    }));

const readUpgradeEntries = () =>
    readLevelDefinitions({
        levelsPath: BREEDING_UPGRADES_PATH,
        definitionsPath: "PetUpgradeINFO",
        mapEntry: ({ index, definition, rawLevel }) => {
            const rawName = String(definition[0] ?? "").trim();
            if (!rawName || (index !== 0 && rawName === "No_Upgrade_Selected")) return null;

            const maxLevel = toInt(definition[8], { min: 0 });

            return {
                index,
                key: `upgrade:${index}:${rawName}`,
                name: cleanName(rawName, `Upgrade ${index}`),
                path: `${BREEDING_UPGRADES_PATH}[${index}]`,
                value: Math.min(maxLevel, toInt(rawLevel, { min: 0 })),
                max: maxLevel,
                formatted: false,
                badge: (currentValue) => `${currentValue ?? 0} / ${maxLevel}`,
            };
        },
    });

export const GeneralTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Breeding general" });
    const eggEntries = van.state([]);
    const upgradeEntries = van.state([]);
    const arenaRoundState = van.state(0);
    const spiceClaimState = van.state(0);
    const getEggState = createIndexedStateGetter(0);
    const getUpgradeState = createIndexedStateGetter(0);
    const eggRows = div({ class: "account-item-stack account-item-stack--dense" });
    const upgradeRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileEggRows = createStaticRowReconciler(eggRows);
    const reconcileUpgradeRows = createStaticRowReconciler(upgradeRows);
    const eggBulk = useWriteStatus();

    const setAllEggs = async (targetValue) =>
        eggBulk.run(async () => {
            if (eggEntries.val.length === 0) return;

            await runBulkSet({
                entries: () => eggEntries.val,
                getTargetValue: () => targetValue,
                getValueState: (entry) => getEggState(entry.index),
                getPath: (entry) => entry.path,
                shouldWrite: () => true,
            });
        });

    const reconcileRows = () => {
        reconcileEggRows(
            eggEntries.val.map((entry) => entry.key).join("|"),
            () => eggEntries.val.map((entry) => SimpleNumberRow({ entry, valueState: getEggState(entry.index) }))
        );
        reconcileUpgradeRows(
            upgradeEntries.val.map((entry) => entry.key).join("|"),
            () =>
                upgradeEntries.val.map((entry) =>
                    SimpleNumberRow({ entry, valueState: getUpgradeState(entry.index) })
                )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawEggs, rawOptions, eggCapacity, upgrades] = await Promise.all([
                gga(BREEDING_EGGS_PATH),
                readGgaEntries("OptionsListAccount", ["89", "100"]),
                readComputed("breeding", "TotalEggCapacity", []),
                readUpgradeEntries(),
            ]);

            eggEntries.val = buildEggEntries(rawEggs, eggCapacity);
            upgradeEntries.val = upgrades;
            arenaRoundState.val = toInt(rawOptions["89"], { min: 0 });
            spiceClaimState.val = toInt(rawOptions["100"], { min: 0 });
            reconcileRows();

            for (const entry of eggEntries.val) getEggState(entry.index).val = entry.value;
            for (const entry of upgradeEntries.val) getUpgradeState(entry.index).val = entry.value;
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "EGGS",
            note: () => `${eggEntries.val.length} EGG SLOTS FROM TotalEggCapacity`,
            meta: spacedActionGroup(
                ActionButton({
                    label: "MAX ALL",
                    status: eggBulk.status,
                    variant: "max-reset",
                    onClick: (e) => {
                        e.preventDefault();
                        void setAllEggs(EGG_MAX_RARITY);
                    },
                }),
                ActionButton({
                    label: "ZERO ALL",
                    status: eggBulk.status,
                    variant: "max-reset",
                    onClick: (e) => {
                        e.preventDefault();
                        void setAllEggs(0);
                    },
                })
            ),
            body: eggRows,
        }),
        AccountSection({
            title: "UPGRADES",
            note: () => `${upgradeEntries.val.length} PET UPGRADES`,
            body: upgradeRows,
        }),
        AccountSection({
            title: "ARENA",
            note: "OptionsListAccount[89]",
            body: div(
                { class: "account-item-stack" },
                SimpleNumberRow({
                    entry: {
                        index: 89,
                        name: "Highest Pet Arena Round",
                        path: ARENA_ROUND_PATH,
                        formatted: false,
                        badge: (currentValue) => `ROUND ${currentValue ?? 0}`,
                    },
                    valueState: arenaRoundState,
                })
            ),
        }),
        AccountSection({
            title: "SPICE CLAIM",
            note: "OptionsListAccount[100]",
            body: div(
                { class: "account-item-stack" },
                SimpleNumberRow({
                    entry: {
                        index: 100,
                        name: "Spiceclaim Counter",
                        path: SPICE_CLAIM_PATH,
                        max: 100,
                        formatted: false,
                        badge: (currentValue) => `${currentValue ?? 0} / 100`,
                    },
                    valueState: spiceClaimState,
                })
            ),
        })
    );

    return PersistentAccountListPage({
        title: "BREEDING GENERAL",
        description: "Edit W4 Breeding egg rarity, pet upgrades, highest Pet Arena round, and spice claim counter.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING BREEDING GENERAL",
        errorTitle: "BREEDING GENERAL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
