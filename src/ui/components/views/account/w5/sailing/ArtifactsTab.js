import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const ARTIFACT_LEVELS_PATH = "Sailing[3]";

const ArtifactRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                max: 6,
                fallback: null,
            }),
        write: (nextLevel) => writeVerified(`${ARTIFACT_LEVELS_PATH}[${entry.index}]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / 6`,
        maxAction: { value: 6, label: "MAX" },
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const current = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.max(0, Math.min(6, current + delta));
        },
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildArtifactEntries = (rawLevels, rawArtifactInfo) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawArtifactInfo ?? []).map((rawArtifact, index) => {
        const artifact = toIndexedArray(rawArtifact ?? []);
        return {
            index,
            rawName: String(artifact[0] ?? `Artifact_${index}`).trim(),
            name: cleanName(artifact[0], `Artifact ${index + 1}`),
            level: Math.min(6, toInt(levels[index], { min: 0 })),
        };
    });
};

export const ArtifactsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sailing Artifacts" });
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawArtifactInfo] = await Promise.all([
                gga(ARTIFACT_LEVELS_PATH),
                readCList("ArtifactInfo"),
            ]);
            entries.val = buildArtifactEntries(rawLevels, rawArtifactInfo);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    ArtifactRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = entry.level;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "SAILING ARTIFACTS",
            note: () => `${entries.val.length} ARTIFACTS FROM ArtifactInfo`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "ARTIFACTS",
        description: "Edit Sailing artifact levels from Sailing[3]. Names come from ArtifactInfo.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SAILING ARTIFACTS",
        errorTitle: "SAILING ARTIFACTS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
