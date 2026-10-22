import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readComputed } from "../../../../../services/api.js";
import { useWriteStatus, writeVerified } from "../../accountShared.js";
import { ActionButton } from "../../components/ActionButton.js";

const ORGANIC_LABELS_PATH = "Spelunk[50]";

export const useOrganicLabels = (loading, entries) => {
    const selected = van.state([]);
    const capacity = van.state(0);
    const ready = van.state(false);
    const lastIndex = van.state(null);
    const writeError = van.state("");
    const { status, run, clearStatus } = useWriteStatus({ errorMs: 0 });
    const disabled = (entry) =>
        loading.val ||
        !ready.val ||
        status.val === "loading" ||
        (!selected.val.includes(entry.organicIndex) && entry.rawName === "NAME_MAGNI");

    const read = async () => {
        const [indices, owned] = await Promise.all([
            gga(ORGANIC_LABELS_PATH),
            readComputed("menagerie", "OrganicLabelOwned", [0, 0]),
        ]);
        if (
            !Array.isArray(indices) ||
            !indices.every((index) => Number.isSafeInteger(index) && index >= 0 && index < entries.val.length) ||
            new Set(indices).size !== indices.length ||
            !Number.isSafeInteger(owned) ||
            owned < 0
        ) {
            throw new Error("Unexpected Organic Label data or owned label count.");
        }
        selected.val = indices;
        capacity.val = owned;
    };

    const load = async () => {
        ready.val = false;
        await read();
        clearStatus();
        writeError.val = "";
        ready.val = true;
    };

    const toggle = async (entry) => {
        if (disabled(entry)) return;
        const index = entry.organicIndex;
        const wasSelected = selected.val.includes(index);
        lastIndex.val = index;
        writeError.val = "";
        await run(
            async () => {
                // Read again so edits made in the game since loading are preserved.
                await read();
                if (selected.val.includes(index) !== wasSelected) return { cancelled: true };
                const next = wasSelected
                    ? selected.val.filter((current) => current !== index)
                    : [...selected.val, index];
                await writeVerified(ORGANIC_LABELS_PATH, next);
                selected.val = next;
                try {
                    await readComputed("farming", "ExoticBonusQTY", [-1, 0]);
                } catch (error) {
                    throw new Error(`Label saved, but bonus recalculation failed: ${error.message}`);
                }
            },
            { onError: (error) => (writeError.val = error.message) }
        );
    };

    return { selected, capacity, lastIndex, status, writeError, disabled, load, toggle };
};

export const OrganicLabelButton = ({ labels, entry }) => {
    const status = () => (labels.lastIndex.val === entry.organicIndex ? labels.status.val : null);
    return van.tags.span(
        { class: "farming-organic-label" },
        ActionButton({
            label: () => {
                if (status() === "loading") return "SAVING...";
                if (status() === "success") return "SAVED";
                if (status() === "error") return "FAILED";
                return "ORGANIC";
            },
            variant: "account-btn farming-organic-button",
            status,
            buttonProps: { "aria-pressed": () => labels.selected.val.includes(entry.organicIndex) },
            disabled: () => labels.disabled(entry),
            tooltip: () => {
                const base = labels.selected.val.includes(entry.organicIndex)
                    ? `${entry.name} is organic. Click to remove its label in this editor.`
                    : entry.rawName === "NAME_MAGNI"
                      ? "This placeholder upgrade cannot receive an Organic Label."
                      : `Make ${entry.name} organic: 2× bonus and 1.5× levels per purchase. Game caps still apply.`;
                return status() === "error" ? `${base} ${labels.writeError.val}` : base;
            },
            onClick: () => void labels.toggle(entry),
        }),
        van.tags.span({ class: "account-write-feedback", role: "status" }, () => {
            if (status() === "loading") return `${entry.name}: saving Organic Label.`;
            if (status() === "success") return `${entry.name}: Organic Label saved.`;
            if (status() === "error") return `${entry.name}: ${labels.writeError.val}`;
            return "";
        })
    );
};
