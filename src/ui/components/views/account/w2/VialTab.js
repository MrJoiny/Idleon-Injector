/**
 * W2 - Vials Tab (Alchemy Vials)
 *
 * Vial definitions: cList.AlchemyDescription[4]
 *   entry[0] = internal name key (for example "COPPER_CORONA")
 *
 * Levels stored in: CauldronInfo[4]
 * Level range: 0-13 (integer)
 *
 * Uses one persistent van.state per vial level so row writes and bulk updates
 * both update the same committed state without rebuilding row-local truth.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { BulkActionBar, SetAllNumberControl } from "../BulkActionBar.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    createIndexedStateGetter,
    createStaticRowReconciler,
    readLevelDefinitions,
    runBulkSet,
    toNum,
    useWriteStatus,
} from "../accountShared.js";

const { div } = van.tags;

const MAX_VIAL_LEVEL = 13;

const VialRow = ({ vial, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `CauldronInfo[4][${vial.index}]`,
        max: MAX_VIAL_LEVEL,
        integerMode: "round",
        indexLabel: `#${vial.index}`,
        name: vial.name,
    });

export const VialTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Vials" });
    const setAllInput = van.state("13");
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const vialDefs = van.state([]);
    const getLevelState = createIndexedStateGetter();
    const listNode = div({ class: "account-list" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const nextVialDefs = await readLevelDefinitions({
                levelsPath: "CauldronInfo",
                definitionsPath: "AlchemyDescription",
                selectLevels: (_, levels) => levels[4],
                selectDefinitions: (_, definitions) => definitions[4],
                mapEntry: ({ definition, rawLevel, index }) => {
                    const name = cleanName(definition[0], "VIAL");
                    if (name.toUpperCase() === "VIAL" || name.trim() === "") return null;
                    return { name, index, level: toNum(rawLevel) };
                },
            });

            nextVialDefs.forEach((vial) => {
                getLevelState(vial.index).val = vial.level;
            });

            vialDefs.val = nextVialDefs.map(({ name, index }) => ({ name, index }));
            reconcileRows(
                vialDefs.val.map((vial) => `${vial.index}:${vial.name}`).join("|"),
                () => vialDefs.val.map((vial) => VialRow({ vial, levelState: getLevelState(vial.index) }))
            );
        });

    const doSetAll = async () => {
        const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(setAllInput.val))));
        if (Number.isNaN(lvl)) return;
        const vials = vialDefs.val ?? [];
        if (vials.length === 0) return;

        await runBulk(async () => {
            await runBulkSet({
                entries: vials,
                getTargetValue: () => lvl,
                getValueState: (vial) => getLevelState(vial.index),
                getPath: (vial) => `CauldronInfo[4][${vial.index}]`,
            });
        });
    };

    load();

    return PersistentAccountListPage({
        rootClass: "vials-tab tab-container",
        title: "ALCHEMY - VIALS",
        description: "Set vial levels (0-13) for all alchemy vials.",
        wrapActions: false,
        actions: BulkActionBar({
            leading: SetAllNumberControl({
                label: "SET ALL:",
                value: setAllInput,
                status: bulkStatus,
                onApply: doSetAll,
                max: MAX_VIAL_LEVEL,
            }),
            refresh: { onClick: load },
        }),
        state: { loading, error },
        loadingText: "READING VIALS",
        errorTitle: "VIAL READ FAILED",
        initialWrapperClass: "account-list",
        body: listNode,
    });
};
