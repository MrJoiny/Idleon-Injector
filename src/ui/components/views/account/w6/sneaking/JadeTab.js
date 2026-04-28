import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    useWriteStatus,
    writeVerified,
} from "../../accountShared.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, input, label, span } = van.tags;

const JADE_BOUGHT_PATH = "Ninja[102][9]";

const toggleLetter = (encoded, letter, enabled) => {
    const current = String(encoded ?? "");
    if (enabled) return current.includes(letter) ? current : `${current}${letter}`;
    return current.replaceAll(letter, "");
};

const JadeUpgradeRow = ({ entry, boughtState, encodedState }) => {
    const { status, run } = useWriteStatus();

    const writeToggle = async (enabled) => {
        await run(async () => {
            const nextEncoded = toggleLetter(encodedState.val, entry.letter, enabled);
            await writeVerified(JADE_BOUGHT_PATH, nextEncoded);
            encodedState.val = nextEncoded;
            boughtState.val = enabled;
        });
    };

    return AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => (boughtState.val ? "BOUGHT" : "LOCKED"),
        rowClass: () => (boughtState.val ? "sneaking-toggle-row sneaking-toggle-row--enabled" : "sneaking-toggle-row"),
        status,
        controls: label(
            { class: "toggle-switch", title: "Toggle Jade Emporium upgrade" },
            input({
                type: "checkbox",
                checked: () => boughtState.val,
                disabled: () => status.val === "loading",
                onchange: (e) => void writeToggle(e.target.checked),
            }),
            span({ class: "slider" })
        ),
    });
};

const buildJadeEntries = (rawDefinitions, rawLetters, rawOrder, encoded) => {
    const definitions = toIndexedArray(rawDefinitions ?? []);
    const letters = toIndexedArray(rawLetters ?? []);
    return toIndexedArray(rawOrder ?? [])
        .map((rawIndex) => {
            const index = Number(rawIndex);
            const rawDefinition = definitions[index];
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[0] ?? "").trim();
            const letter = letters[index];
            if (!Number.isInteger(index) || !rawName || !letter) return null;

            return {
                index,
                rawName,
                name: cleanName(rawName, `Jade Upgrade ${index + 1}`),
                letter,
                bought: String(encoded ?? "").includes(letter),
            };
        })
        .filter(Boolean);
};

export const JadeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Jade Emporium" });
    const entries = van.state([]);
    const boughtStates = new Map();
    const encodedState = van.state("");
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawEncoded, rawDefinitions, rawOrder, rawLetters] = await Promise.all([
                gga(JADE_BOUGHT_PATH),
                readCList("JadeUpg"),
                readCList("NinjaInfo[24]"),
                gga("Number2Letter"),
            ]);

            encodedState.val = String(rawEncoded ?? "");
            entries.val = buildJadeEntries(rawDefinitions, rawLetters, rawOrder, encodedState.val);
            reconcileRows(entries.val.map((entry) => `${entry.rawName}:${entry.letter}`).join("|"), () =>
                entries.val.map((entry) =>
                    JadeUpgradeRow({
                        entry,
                        boughtState: getOrCreateState(boughtStates, entry.index, false),
                        encodedState,
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(boughtStates, entry.index, false).val = entry.bought;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "JADE EMPORIUM",
            note: () =>
                `${entries.val.filter((entry) => getOrCreateState(boughtStates, entry.index, false).val).length} / ${
                    entries.val.length
                } BOUGHT`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "JADE",
        description: "Toggle Jade Emporium upgrades stored in Ninja[102][9] using Number2Letter encoding.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING JADE EMPORIUM",
        errorTitle: "JADE EMPORIUM READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
