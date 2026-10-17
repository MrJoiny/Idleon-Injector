import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputed } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useWriteStatus, writeVerified } from "../accountShared.js";
import { ActionButton } from "../components/ActionButton.js";

export const useUpgradeDoublers = ({ path, ownedMethod, eligiblePath }, loading) => {
    const selected = van.state([]);
    const eligible = van.state([]);
    const capacity = van.state(0);
    const ready = van.state(false);
    const lastIndex = van.state(null);
    const writeError = van.state("");
    const { status, run, clearStatus } = useWriteStatus({ errorMs: 0 });
    const disabled = (index) =>
        loading.val ||
        !ready.val ||
        status.val === "loading" ||
        !eligible.val.includes(index) ||
        (!selected.val.includes(index) && selected.val.length >= capacity.val);

    const load = async () => {
        ready.val = false;
        const [rawSelected, rawCapacity, rawEligible] = await Promise.all([
            gga(path),
            readComputed("menagerie", ownedMethod),
            readCList(eligiblePath),
        ]);
        const indices = toIndexedArray(rawSelected ?? []);
        const eligibleIndices = toIndexedArray(rawEligible ?? []).map(Number);
        const maxSelected = Number(rawCapacity);
        if (
            !Array.isArray(rawSelected) ||
            !indices.every((index) => Number.isSafeInteger(index) && index >= 0) ||
            !Array.isArray(rawEligible) ||
            !eligibleIndices.every((index) => Number.isSafeInteger(index) && index >= 0) ||
            !Number.isSafeInteger(maxSelected) ||
            maxSelected < 0
        ) {
            throw new Error(`Unexpected doubler data in ${path}, ${ownedMethod}, or ${eligiblePath}.`);
        }

        selected.val = indices;
        eligible.val = eligibleIndices;
        capacity.val = maxSelected;
        clearStatus();
        writeError.val = "";
        ready.val = true;
    };

    const toggle = async (index) => {
        if (disabled(index)) return;
        const isSelected = selected.val.includes(index);
        const next = isSelected ? selected.val.filter((current) => current !== index) : [...selected.val, index];
        lastIndex.val = index;
        writeError.val = "";
        await run(
            async () => {
                await writeVerified(path, next);
                selected.val = next;
            },
            {
                onError: (error) => {
                    writeError.val = error.message;
                },
            }
        );
    };

    return { selected, eligible, capacity, lastIndex, status, writeError, disabled, load, toggle };
};

export const UpgradeDoublerButton = ({ doublers, index, name }) => {
    const status = () => (doublers.lastIndex.val === index ? doublers.status.val : null);
    return van.tags.span(
        { class: "upgrade-doubler-slot" },
        ActionButton({
            label: "2×",
            variant: "account-btn upgrade-doubler-button",
            status,
            buttonProps: {
                hidden: () => !doublers.eligible.val.includes(index),
                "aria-label": `Double ${name}`,
                "aria-pressed": () => doublers.selected.val.includes(index),
            },
            disabled: () => doublers.disabled(index),
            tooltip: () => {
                const selected = doublers.selected.val.includes(index);
                const base = selected
                    ? `${name} is doubled. Click to remove its doubler.`
                    : doublers.selected.val.length >= doublers.capacity.val
                      ? `All ${doublers.capacity.val} doubler slots are in use. Remove one before selecting ${name}.`
                      : `Click to double ${name}.`;
                return status() === "error" ? `${base} Save failed: ${doublers.writeError.val}` : base;
            },
            onClick: () => void doublers.toggle(index),
        }),
        van.tags.span({ class: "account-write-feedback", role: "status" }, () => {
            if (status() === "loading") return `${name}: saving doubler.`;
            if (status() === "success") return `${name}: doubler saved.`;
            if (status() === "error") return `${name}: ${doublers.writeError.val}`;
            return "";
        })
    );
};
