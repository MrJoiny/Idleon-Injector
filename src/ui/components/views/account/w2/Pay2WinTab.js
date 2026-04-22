/**
 * W2 - Pay 2 Win Tab (Alchemy P2W)
 *
 * Data paths:
 *   CauldronP2W[0][f + 3*e] -> Brewing cauldrons
 *   CauldronP2W[1][f + 2*e] -> Liquid cauldrons
 *   CauldronP2W[2][e]       -> Vial upgrades
 *   CauldronP2W[3][e]       -> Player boosts
 *   OptionsListAccount[123] -> Draconic cauldron count
 *
 * Max levels are read via readComputedMany("alchemy", "CauldronLvMAX", ...).
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readComputedMany } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { AccountSection } from "../components/AccountSection.js";
import { writeVerified } from "../accountShared.js";
import { EditableNumberRow } from "../EditableNumberRow.js";

const { div, span } = van.tags;

const makeStateList = (count, initialValue = 0) => Array.from({ length: count }, () => van.state(initialValue));
const makeStateGrid = (columns, rows, initialValue = 0) =>
    Array.from({ length: columns }, () => makeStateList(rows, initialValue));

const P2W_SECTION_DEFS = [
    {
        kind: "grid",
        title: "BREWING CAULDRONS",
        note: "P2W upgrade levels per cauldron",
        bucket: 0,
        stride: 3,
        columns: [
            { label: "POWER CAULDRON", tone: "brew-power" },
            { label: "QUICC CAULDRON", tone: "brew-quicc" },
            { label: "HIGH-IQ CAULDRON", tone: "brew-high-iq" },
            { label: "KAZAM CAULDRON", tone: "brew-kazam" },
        ],
        rowLabels: ["SPEED", "NEW BUBBLE", "BOOST REQ"],
    },
    {
        kind: "grid",
        title: "LIQUID CAULDRONS",
        note: "P2W upgrade levels per liquid",
        bucket: 1,
        stride: 2,
        columns: [
            { label: "WATER DROPLETS", tone: "liquid-water-droplets" },
            { label: "LIQUID NITROGEN", tone: "liquid-nitrogen" },
            { label: "TRENCH SEAWATER", tone: "liquid-trench-seawater" },
            { label: "TOXIC MERCURY", tone: "liquid-toxic-mercury" },
        ],
        rowLabels: ["REGEN", "CAPACITY"],
    },
    {
        kind: "single",
        title: "DRACONIC CAULDRONS",
        note: "Number of draconic liquid cauldrons (0-4)",
        rowLabels: ["COUNT"],
        max: 4,
        writePath: "OptionsListAccount[123]",
    },
    {
        kind: "list",
        title: "VIALS UPGRADES",
        note: "P2W vial upgrade levels",
        bucket: 2,
        rowLabels: ["ATTEMPTS", "RNG"],
    },
    {
        kind: "list",
        title: "PLAYER BOOSTS",
        note: "P2W player alchemy boosts",
        bucket: 3,
        rowLabels: ["ALCH SPD", "EXTRA EXP"],
    },
];

const createSectionState = (section) => {
    if (section.kind === "grid") {
        return {
            ...section,
            valueStates: makeStateGrid(section.columns.length, section.rowLabels.length),
            maxStates: makeStateGrid(section.columns.length, section.rowLabels.length),
        };
    }

    if (section.kind === "single") {
        return {
            ...section,
            valueStates: makeStateList(section.rowLabels.length),
            maxStates: makeStateList(section.rowLabels.length, section.max ?? 0),
        };
    }

    return {
        ...section,
        valueStates: makeStateList(section.rowLabels.length),
        maxStates: makeStateList(section.rowLabels.length),
    };
};

const P2WRow = ({ label, valueState, maxState, writePath }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const parsed = Math.max(0, Math.round(Number(rawValue)));
            return Number.isNaN(parsed) ? null : parsed;
        },
        write: async (nextValue) =>
            writeVerified(writePath, nextValue, {
                message: `Write mismatch at ${writePath}: expected ${nextValue}`,
            }),
        renderInfo: () => span({ class: "account-row__name" }, label),
        renderBadge: (currentValue) => {
            const cur = currentValue ?? 0;
            const max = maxState.val;
            return max > 0 ? `${cur} / ${max}` : String(cur);
        },
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            const max = Number(maxState.val);
            const updated = Math.max(0, next + delta);
            return max > 0 ? Math.min(max, updated) : updated;
        },
        inputMode: "int",
    });

const renderSection = (section) => {
    if (section.kind === "grid") {
        return AccountSection({
            title: section.title,
            note: section.note,
            body: div(
                { class: "grid-4col" },
                ...section.columns.map((column, columnIndex) =>
                    div(
                        { class: `p2w-col ${column.tone ? `p2w-col--${column.tone}` : ""}` },
                        div({ class: "col-header" }, span({ class: "col-header__name" }, column.label)),
                        ...section.rowLabels.map((label, rowIndex) =>
                            P2WRow({
                                label,
                                valueState: section.valueStates[columnIndex][rowIndex],
                                maxState: section.maxStates[columnIndex][rowIndex],
                                writePath: `CauldronP2W[${section.bucket}][${rowIndex + section.stride * columnIndex}]`,
                            })
                        )
                    )
                )
            ),
        });
    }

    return AccountSection({
        title: section.title,
        note: section.note,
        body: section.rowLabels.map((label, index) =>
            P2WRow({
                label,
                valueState: section.valueStates[index],
                maxState: section.maxStates[index],
                writePath: section.kind === "single" ? section.writePath : `CauldronP2W[${section.bucket}][${index}]`,
            })
        ),
    });
};

export const Pay2WinTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Pay 2 Win" });
    const sections = P2W_SECTION_DEFS.map(createSectionState);

    const load = async () =>
        run(async () => {
            const [rawP2W, rawDraconic] = await Promise.all([gga("CauldronP2W"), gga("OptionsListAccount[123]")]);
            const p2w = toIndexedArray(rawP2W ?? []);
            const maxTargets = [];

            for (const section of sections) {
                if (section.kind === "single") {
                    const rawValue = Number(rawDraconic ?? 0);
                    section.valueStates[0].val = Number.isFinite(rawValue)
                        ? Math.min(section.max, Math.max(0, rawValue))
                        : 0;
                    continue;
                }

                const bucketValues = toIndexedArray(p2w[section.bucket] ?? []);

                if (section.kind === "grid") {
                    for (let columnIndex = 0; columnIndex < section.columns.length; columnIndex++) {
                        for (let rowIndex = 0; rowIndex < section.rowLabels.length; rowIndex++) {
                            const flatIndex = rowIndex + section.stride * columnIndex;
                            section.valueStates[columnIndex][rowIndex].val = Number(bucketValues[flatIndex] ?? 0);
                            maxTargets.push({
                                args: [section.bucket, columnIndex, String(rowIndex)],
                                apply: (value) => {
                                    section.maxStates[columnIndex][rowIndex].val = Number(value ?? 0);
                                },
                            });
                        }
                    }
                    continue;
                }

                for (let index = 0; index < section.rowLabels.length; index++) {
                    section.valueStates[index].val = Number(bucketValues[index] ?? 0);
                    maxTargets.push({
                        args: [section.bucket, index, "0"],
                        apply: (value) => {
                            section.maxStates[index].val = Number(value ?? 0);
                        },
                    });
                }
            }

            const maxResults = await readComputedMany(
                "alchemy",
                "CauldronLvMAX",
                maxTargets.map((entry) => entry.args)
            );

            maxTargets.forEach((entry, index) => {
                if (!maxResults[index]?.ok) {
                    throw new Error(`CauldronLvMAX failed for target ${index}`);
                }
                entry.apply(maxResults[index].value);
            });
        });

    load();

    return AccountPageShell({
        header: AccountTabHeader({
            title: "ALCHEMY - PAY 2 WIN",
            description: "Edit P2W upgrades for cauldrons, liquids, draconic count, vials and player boosts.",
            actions: RefreshButton({ onRefresh: load }),
        }),
        persistentState: { loading, error },
        body: div({ class: "scrollable-panel content-stack" }, ...sections.map(renderSection)),
    });
};
