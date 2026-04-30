import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { toInt, useWriteStatus, writeVerified } from "../../accountShared.js";

const { div, input, span } = van.tags;

const STATION_WIDTH = 15;
const STATION_HEIGHT = 8;
const STATION_SLOT_COUNT = STATION_WIDTH * STATION_HEIGHT;
const SUSHI_SLOT_PATH = "Sushi[0]";
const SUSHI_PLATE_PATH = "Sushi[1]";
const SUSHI_FIREPLACE_PATH = "Sushi[3]";

const plateTypeLabel = (type) => {
    if (type === -1) return "No Slot";
    if (type === 0) return "Normal Plate";
    if (type === 1) return "Red Plate";
    if (type === 2) return "Blue Plate";
    if (type === 3) return "Gold Plate";
    return `Plate Type ${type}`;
};

const normalizeStationValue = (raw, maxTier = Infinity) => Math.min(maxTier, toInt(raw, { min: -1 }));
const toDisplayTier = (rawValue) => (rawValue < 0 ? "" : String(rawValue + 1));
const fromDisplayTier = (rawValue, maxTier) => {
    if (String(rawValue ?? "").trim() === "") return -1;
    return normalizeStationValue(toInt(rawValue, { min: 1 }) - 1, maxTier);
};

const SushiSlotTile = ({ index, tileState, maxTierState }) => {
    const inputValue = van.state(toDisplayTier(tileState.value.val));
    const { status, run } = useWriteStatus({ successMs: 700, errorMs: 1100 });
    let isFocused = false;

    const syncInput = () => {
        inputValue.val = toDisplayTier(tileState.value.val);
    };

    van.derive(() => {
        tileState.value.val;
        if (!isFocused) syncInput();
    });

    const applyValue = async () => {
        const nextValue = fromDisplayTier(inputValue.val, maxTierState.val);
        if (nextValue === tileState.value.val) {
            syncInput();
            return;
        }

        await run(async () => {
            await writeVerified(`${SUSHI_SLOT_PATH}[${index}]`, nextValue);
            tileState.value.val = nextValue;
            inputValue.val = toDisplayTier(nextValue);
        });
    };

    const inputEl = input({
        class: "sushi-station-tile__input",
        type: "text",
        inputmode: "numeric",
        disabled: () => tileState.plateType.val === -1,
        onfocus: () => {
            isFocused = true;
        },
        oninput: (e) => {
            let cleaned = e.target.value.replace(/[^0-9]/g, "");
            if (cleaned !== "") {
                cleaned = toDisplayTier(fromDisplayTier(cleaned, maxTierState.val));
            }
            if (e.target.value !== cleaned) e.target.value = cleaned;
            inputValue.val = cleaned;
        },
        onblur: () => {
            isFocused = false;
            void applyValue();
        },
        onkeydown: (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.currentTarget.blur();
        },
        title: () => `Slot ${index} - ${plateTypeLabel(tileState.plateType.val)} - Max tier ${maxTierState.val + 1}`,
        value: inputValue,
    });

    return div(
        {
            class: () =>
                [
                    "sushi-station-tile",
                    `sushi-station-tile--plate-${tileState.plateType.val}`,
                    tileState.plateType.val === -1 ? "sushi-station-tile--locked" : "",
                    status.val === "success" ? "sushi-station-tile--success" : "",
                    status.val === "error" ? "sushi-station-tile--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        inputEl
    );
};

export function SushiStationTab() {
    const { loading, error, run } = useAccountLoad({ label: "Sushi Station" });
    const tileStates = Array.from({ length: STATION_SLOT_COUNT }, () => ({
        value: van.state(-1),
        plateType: van.state(-1),
    }));
    const fireplaceStates = Array.from({ length: STATION_WIDTH }, () => van.state(-1));
    const maxTierState = van.state(-1);

    const load = async () =>
        run(async () => {
            const [rawSlots, rawPlates, rawFireplaces, rawKnowledgeNames] = await Promise.all([
                gga(SUSHI_SLOT_PATH),
                gga(SUSHI_PLATE_PATH),
                gga(SUSHI_FIREPLACE_PATH),
                readCList("Research[30]"),
            ]);
            const slots = toIndexedArray(rawSlots ?? []);
            const plates = toIndexedArray(rawPlates ?? []);
            const fireplaces = toIndexedArray(rawFireplaces ?? []);
            maxTierState.val = toIndexedArray(rawKnowledgeNames ?? []).reduce(
                (maxIndex, rawName, index) => (String(rawName ?? "").trim() ? index : maxIndex),
                -1
            );

            for (let index = 0; index < STATION_SLOT_COUNT; index++) {
                tileStates[index].value.val = normalizeStationValue(slots[index] ?? -1, maxTierState.val);
                tileStates[index].plateType.val = toInt(plates[index], { min: -1 });
            }

            for (let column = 0; column < STATION_WIDTH; column++) {
                fireplaceStates[column].val = toInt(fireplaces[column], { min: -1 });
            }
        });

    load();

    const body = div(
        { class: "sushi-station-shell scrollable-panel" },
        div(
            { class: "sushi-station-board-wrap" },
            div(
                {
                    class: "sushi-station-board",
                    style: `grid-template-columns: repeat(${STATION_WIDTH}, minmax(36px, 44px));`,
                },
                ...tileStates.map((tileState, index) => SushiSlotTile({ index, tileState, maxTierState })),
                ...fireplaceStates.map((fireplaceState, column) =>
                    div(
                        {
                            class: () =>
                                ["sushi-fireplace-cell", fireplaceState.val === -1 ? "sushi-fireplace-cell--empty" : ""]
                                    .filter(Boolean)
                                    .join(" "),
                            title: () => `Fireplace ${column}`,
                        },
                        span({ class: "sushi-fireplace-cell__value" }, () => String(fireplaceState.val))
                    )
                )
            )
        )
    );

    return PersistentAccountListPage({
        title: "SUSHI STATION",
        description: "Edit Sushi[0] slot tiers. Plate types from Sushi[1] and fireplaces from Sushi[3] are read-only.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SUSHI STATION",
        errorTitle: "SUSHI STATION READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
}
