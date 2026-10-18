import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { PaletteStarButton, usePaletteStars } from "./PaletteStars.js";

const { div, span } = van.tags;

const PALETTE_LEVELS_PATH = "Spelunk[9]";

const formatPaletteEffect = (rawEffect) => {
    const effect = String(rawEffect ?? "").trim();
    if (!effect) return "";
    return effect.replace(/}x/gi, "X×").replace(/[{}#]/g, "X").replace(/_/g, " ");
};

const PaletteRow = ({ entry, levelState, stars }) =>
    SimpleNumberRow({
        entry,
        valueState: levelState,
        renderExtraActions: () => PaletteStarButton({ stars, entry }),
    });

const buildPaletteEntries = (rawLevels, rawPalette) => {
    const levels = toIndexedArray(rawLevels ?? []);
    return toIndexedArray(rawPalette ?? []).map((rawDefinition, index) => {
        const definition = toIndexedArray(rawDefinition ?? []);
        const rgb = [
            toInt(definition[0], { min: 0 }),
            toInt(definition[1], { min: 0 }),
            toInt(definition[2], { min: 0 }),
        ];

        return {
            index,
            path: `${PALETTE_LEVELS_PATH}[${index}]`,
            rawName: String(definition[3] ?? `Palette_${index}`).trim(),
            name: cleanName(definition[3], `Palette ${index + 1}`),
            subLabel: formatPaletteEffect(definition[10]),
            rowClass: "account-row--wide-controls gaming-palette-row",
            rgb,
            leading: () =>
                span({
                    class: "gaming-palette-swatch",
                    style: `--palette-color: rgb(${rgb.join(", ")});`,
                    title: rgb.join(", "),
                }),
            formatted: false,
            badge: (currentValue) => `LV ${currentValue ?? 0}`,
            level: toInt(levels[index], { min: 0 }),
        };
    });
};

export const PaletteTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming Palette" });
    const stars = usePaletteStars(loading);
    const entries = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawPalette] = await Promise.all([
                gga(PALETTE_LEVELS_PATH),
                readCList("GamingPalette"),
                stars.load(),
            ]);
            entries.val = buildPaletteEntries(rawLevels, rawPalette);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    PaletteRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.index),
                        stars,
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
            title: "PALETTE",
            note: () => `${entries.val.length} COLORS · LEVELS & BLACK STARS`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "PALETTE",
        description: "Edit Gaming Palette levels and Black Stars. Names and colors come from GamingPalette.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val || stars.status.val === "loading",
        }),
        state: { loading, error },
        loadingText: "READING GAMING PALETTE",
        errorTitle: "GAMING PALETTE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
