import van from "../../../../../vendor/van-1.6.0.js";
import { deleteGga, gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { useWriteStatus, writeVerified } from "../../accountShared.js";
import { ActionButton } from "../../components/ActionButton.js";

const PALETTE_STARS_PATH = "Spelunk[49]";

export const usePaletteStars = (loading) => {
    const values = van.state([]);
    const lastIndex = van.state(null);
    const writeError = van.state("");
    const { status, run, clearStatus } = useWriteStatus({ errorMs: 0 });
    const disabled = () => loading.val || status.val === "loading" || values.val.length !== 37;

    const load = async () => {
        const rawStars = await gga(PALETTE_STARS_PATH);
        const stars = toIndexedArray(rawStars);
        if (stars.length !== 37 || !stars.every((value) => Number.isInteger(value) && value >= 0 && value <= 2)) {
            throw new Error("Expected 37 Black Star counts between 0 and 2 in Spelunk[49].");
        }
        values.val = stars;
        clearStatus();
        writeError.val = "";
    };

    const set = async (index, value) => {
        if (disabled()) return;
        lastIndex.val = index;
        await run(
            async () => {
                if (values.val[index] === value) return { cancelled: true };
                writeError.val = "";
                await writeVerified(`${PALETTE_STARS_PATH}[${index}]`, value);
                values.val = values.val.map((current, i) => (i === index ? value : current));
                // PaletteBonus reuses this cache until it is deleted or rebuilt by the game.
                await deleteGga("DNSM.h.PaletteBonz");
            },
            {
                onError: (error) => {
                    writeError.val = error.message;
                },
            }
        );
    };

    return { values, lastIndex, status, writeError, disabled, load, set };
};

export const PaletteStarButton = ({ stars, entry }) =>
    ActionButton({
        label: () => {
            const count = stars.values.val[entry.index] ?? 0;
            if (stars.lastIndex.val === entry.index && stars.status.val === "loading") return "SAVING...";
            if (stars.lastIndex.val === entry.index && stars.status.val === "success") return "SAVED";
            if (stars.lastIndex.val === entry.index && stars.status.val === "error") return "FAILED";
            return `${count} ★ · ${[1, 2, 4][count]}×`;
        },
        className: "gaming-palette-star-button",
        status: () => (stars.lastIndex.val === entry.index ? stars.status.val : null),
        disabled: stars.disabled,
        tooltip: () => {
            const base = `${entry.name}: Black Stars. Click to cycle 0 → 1 → 2 → 0.`;
            return stars.lastIndex.val === entry.index && stars.status.val === "error"
                ? `${base} Save failed: ${stars.writeError.val}`
                : base;
        },
        onClick: () => void stars.set(entry.index, (stars.values.val[entry.index] + 1) % 3),
    });
