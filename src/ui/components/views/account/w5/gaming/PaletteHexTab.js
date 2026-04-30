import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { getNumberInputLiveRaw, NumberInput } from "../../../../NumberInput.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { ActionButton } from "../../components/ActionButton.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const PALETTE_LEVELS_PATH = "Spelunk[9]";
const PALETTE_ROW_SIZES = [7, 8, 7, 8, 7];

const getTextColor = ([red, green, blue]) => {
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.58 ? "#05080d" : "#f7f8fb";
};

const buildPaletteEntries = (rawLevels, rawPalette) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawPalette ?? []).map((rawDefinition, index) => {
        const definition = toIndexedArray(rawDefinition ?? []);
        return {
            index,
            name: cleanName(definition[3], `Palette ${index + 1}`),
            rgb: [toInt(definition[0], { min: 0 }), toInt(definition[1], { min: 0 }), toInt(definition[2], { min: 0 })],
            level: toInt(levels[index], { min: 0 }),
        };
    });
};

const sliceRows = (entries) => {
    let offset = 0;
    return PALETTE_ROW_SIZES.map((size) => {
        const row = entries.slice(offset, offset + size);
        offset += size;
        return row;
    });
};

const PaletteHex = ({ entry, levelState }) => {
    const inputValue = van.state(String(levelState.val ?? 0));
    const { status, run } = useWriteStatus();
    let isInputFocused = false;

    const syncInput = () => {
        inputValue.val = String(levelState.val ?? 0);
    };

    van.derive(() => {
        levelState.val;
        if (!isInputFocused) syncInput();
    });

    const applyValue = async () => {
        const nextLevel = resolveNumberInput(getNumberInputLiveRaw(inputValue) ?? inputValue.val, {
            min: 0,
            fallback: null,
        });
        if (nextLevel === null || nextLevel === undefined || Number.isNaN(nextLevel)) return;

        await run(async () => {
            const verified = await writeVerified(`${PALETTE_LEVELS_PATH}[${entry.index}]`, nextLevel);
            levelState.val = verified;
            inputValue.val = String(verified);
        });
    };

    return div(
        {
            class: "gaming-palette-hex",
            style: `--hex-bg: rgb(${entry.rgb.join(", ")}); --hex-fg: ${getTextColor(entry.rgb)};`,
            title: `${entry.name} (${entry.rgb.join(", ")})`,
        },
        div(
            { class: "gaming-palette-hex__editor" },
            NumberInput({
                value: inputValue,
                onfocus: () => {
                    isInputFocused = true;
                },
                onblur: () => {
                    isInputFocused = false;
                    syncInput();
                },
                onDecrement: () => {
                    inputValue.val = String(Math.max(0, Number(inputValue.val || levelState.val || 0) - 1));
                },
                onIncrement: () => {
                    inputValue.val = String(Number(inputValue.val || levelState.val || 0) + 1);
                },
            }),
            ActionButton({
                label: "SET",
                status,
                onClick: (e) => {
                    e.preventDefault();
                    void applyValue();
                },
            })
        )
    );
};

export const PaletteHexTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming Palette Hex" });
    const entries = van.state([]);
    const levelStates = new Map();
    const gridNode = div({ class: "gaming-palette-hex-grid" });
    const reconcileGrid = createStaticRowReconciler(gridNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawPalette] = await Promise.all([gga(PALETTE_LEVELS_PATH), readCList("GamingPalette")]);
            entries.val = buildPaletteEntries(rawLevels, rawPalette);
            reconcileGrid(entries.val.map((entry) => `${entry.index}:${entry.name}`).join("|"), () =>
                sliceRows(entries.val).map((row) =>
                    div(
                        { class: "gaming-palette-hex-row" },
                        ...row.map((entry) =>
                            PaletteHex({
                                entry,
                                levelState: getOrCreateState(levelStates, entry.index),
                            })
                        )
                    )
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = entry.level;
            }
        });

    load();

    const body = div({ class: "scrollable-panel gaming-palette-hex-panel" }, gridNode);

    return PersistentAccountListPage({
        title: "PALETTE HEX",
        description: "Edit Gaming Palette levels in the in-game hex layout. Order follows GamingPalette rows.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING GAMING PALETTE HEX",
        errorTitle: "GAMING PALETTE HEX READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
