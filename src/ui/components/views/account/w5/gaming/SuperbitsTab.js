import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    writeVerified,
} from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountToggleRow } from "../../components/AccountToggleRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const SUPERBITS_PATH = "Gaming[12]";
const SUPERBIT_SECTIONS = [
    { key: "super", title: "SUPERBITS", start: 0, end: 24 },
    { key: "duper", title: "DUPERBITS", start: 24, end: 48 },
    { key: "zuper", title: "ZUPERBITS", start: 48, end: Infinity },
];

const toggleLetter = (encoded, letter, enabled) => {
    const current = String(encoded ?? "");
    if (enabled) return current.includes(letter) ? current : `${current}${letter}`;
    return current.replaceAll(letter, "");
};

const SuperbitRow = ({ entry, unlockedState, encodedState }) => {
    const writeToggle = async (enabled) => {
        const nextEncoded = toggleLetter(encodedState.val, entry.letter, enabled);
        await writeVerified(SUPERBITS_PATH, nextEncoded);
        encodedState.val = nextEncoded;
        unlockedState.val = enabled;
    };

    return AccountToggleRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => (unlockedState.val ? "UNLOCKED" : "LOCKED"),
        rowClass: "gaming-toggle-row",
        checked: () => Boolean(unlockedState.val),
        title: "Toggle Superbit unlock",
        write: writeToggle,
    });
};

const buildSuperbitEntries = (rawDefinitions, rawLetters, encoded) => {
    const letters = toIndexedArray(rawLetters ?? []);
    return toIndexedArray(rawDefinitions ?? [])
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const letter = letters[index];
            const rawName = String(definition[3] ?? "").trim();
            if (!letter || !rawName) return null;

            return {
                index,
                rawName,
                letter,
                name: cleanName(rawName, `Superbit ${index + 1}`),
                unlocked: String(encoded ?? "").includes(letter),
            };
        })
        .filter(Boolean);
};

const getSectionEntries = (entries, section) =>
    entries.filter((entry) => entry.index >= section.start && entry.index < section.end);

export const SuperbitsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Gaming Superbits" });
    const entries = van.state([]);
    const encodedState = van.state("");
    const unlockedStates = new Map();
    const sectionNodes = new Map();
    const reconcilers = new Map();

    const getSectionNode = (sectionKey) => {
        if (!sectionNodes.has(sectionKey)) {
            const node = div({ class: "account-item-stack" });
            sectionNodes.set(sectionKey, node);
            reconcilers.set(sectionKey, createStaticRowReconciler(node));
        }
        return sectionNodes.get(sectionKey);
    };

    const reconcileSection = (section, sectionEntries) => {
        const node = getSectionNode(section.key);
        reconcilers.get(section.key)(sectionEntries.map((entry) => `${entry.rawName}:${entry.letter}`).join("|"), () =>
            sectionEntries.map((entry) =>
                SuperbitRow({
                    entry,
                    unlockedState: getOrCreateState(unlockedStates, entry.index, false),
                    encodedState,
                })
            )
        );
        return node;
    };

    const load = async () =>
        run(async () => {
            const [rawEncoded, rawDefinitions, rawLetters] = await Promise.all([
                gga(SUPERBITS_PATH),
                readCList("GamingUpg"),
                gga("Number2Letter"),
            ]);

            encodedState.val = String(rawEncoded ?? "");
            entries.val = buildSuperbitEntries(rawDefinitions, rawLetters, encodedState.val);

            for (const entry of entries.val) {
                getOrCreateState(unlockedStates, entry.index, false).val = entry.unlocked;
            }

            for (const section of SUPERBIT_SECTIONS) {
                reconcileSection(section, getSectionEntries(entries.val, section));
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        ...SUPERBIT_SECTIONS.map((section) =>
            AccountSection({
                title: section.title,
                note: () => {
                    const sectionEntries = getSectionEntries(entries.val, section);
                    return `${
                        sectionEntries.filter((entry) => getOrCreateState(unlockedStates, entry.index, false).val)
                            .length
                    } / ${sectionEntries.length} UNLOCKED`;
                },
                body: getSectionNode(section.key),
            })
        )
    );

    return PersistentAccountListPage({
        title: "SUPERBITS",
        description: "Toggle Gaming superbit unlocks from Gaming[12]. Names come from GamingUpg.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING GAMING SUPERBITS",
        errorTitle: "GAMING SUPERBITS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
