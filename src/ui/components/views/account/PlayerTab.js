import van from "../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputed, readGgaEntries } from "../../../services/api.js";
import { toIndexedArray } from "../../../utils/index.js";
import { parseNumber } from "../../../utils/numberFormat.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import {
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    unwrapH,
    writeManyVerified,
} from "./accountShared.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { AccountSection } from "./components/AccountSection.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { createCharacterSelector } from "./components/CharacterSelector.js";

const { div, span } = van.tags;

export const PlayerTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Player" });
    const selected = van.state("");
    const current = van.state("");
    const busy = van.state(false);
    const message = van.state("");
    const values = new Map();
    const rows = div({ class: "account-list" });
    const reconcileRows = createStaticRowReconciler(rows);
    const unavailable = () => loading.val || busy.val || Boolean(error.val);
    const characterSelector = createCharacterSelector({
        id: "player-character",
        selected,
        disabled: () => loading.val || busy.val,
        onChange: (event) => {
            selected.val = event.target.value;
            load();
        },
        info: () =>
            selected.val === current.val
                ? "ACTIVE CHARACTER"
                : "SAVED CHARACTER. Open this character in-game before closing to save level edits.",
    });

    const setValue = async (name, index, next) => {
        if (unavailable()) throw new Error("Player data is busy or unavailable. Refresh and try again.");
        busy.val = true;
        message.val = "";
        try {
            const active = await gga("UserInfo[0]");
            if (active !== current.val || name !== selected.val) {
                throw new Error("The character changed. Refresh and try again.");
            }
            const root = name === active ? "" : `PlayerDATABASE.h[${name}].h.`;
            const field = index === null ? "Money" : `Lv0[${index}]`;
            const before = await gga(`${root}${field}`);
            if (before === next) return { cancelled: true };
            const writes = [];
            if (index !== null) {
                const required = await readComputed("player", "expRequired", [index, next]);
                if (!Number.isFinite(required)) throw new Error("The game returned an invalid XP requirement.");
                writes.push({ path: `${root}Exp0[${index}]`, value: 0 });
                writes.push({ path: `${root}ExpReq0[${index}]`, value: required });
            }
            writes.push({ path: `${root}${field}`, value: next });
            if ((await gga("UserInfo[0]")) !== active) {
                throw new Error("The active character changed. Refresh and try again.");
            }
            await writeManyVerified(writes);
            if ((await gga("UserInfo[0]")) !== active) {
                throw new Error("The active character changed during the write. Refresh to check the result.");
            }
            return next;
        } catch (caught) {
            message.val = `${caught.message} Refresh to reload player values; some writes may have applied.`;
            throw caught;
        } finally {
            busy.val = false;
        }
    };

    const renderRow = (name, index, title) => {
        const money = index === null;
        return EditableNumberRow({
            valueState: getOrCreateState(values, index),
            disabled: unavailable,
            normalize: (raw) => {
                if (String(raw).trim() === "") return null;
                const next = money ? parseNumber(String(raw)) : Number(raw);
                return Number.isFinite(next) && next >= (money ? 0 : 1) && (money || Number.isSafeInteger(next))
                    ? next
                    : null;
            },
            write: (next) => setValue(name, index, next),
            renderInfo: () => span({ class: "account-row__name" }, title),
            renderBadge: (value) => (money ? `${largeFormatter(value)} COPPER` : `LV ${value}`),
            inputMode: money ? "float" : "int",
            inputProps: { "aria-label": title, ...(money ? { formatter: String, parser: largeParser } : {}) },
            rowClass: "account-row--wide-controls",
            controlsClass: "account-row__controls--xl",
        });
    };

    const load = async () => {
        if (busy.val) return;
        await run(async () => {
            const active = await gga("UserInfo[0]");
            const [rawNames, rawSkills] = await Promise.all([gga("GetPlayersUsernames"), readCList("SkillNames")]);
            const names = toIndexedArray(rawNames).filter((name) => typeof name === "string" && name.length > 0);
            if (!names.includes(active)) throw new Error("No active player. Enter the game and refresh.");
            if (!names.includes(selected.val)) selected.val = active;
            const name = selected.val;
            // The shared resolver treats dots and brackets as separators, even inside a name.
            if (/[.[\]]/.test(name))
                throw new Error("This character name cannot be addressed by the game path editor.");
            let levels;
            let money;
            if (name === active) {
                [levels, money] = await Promise.all([gga("Lv0"), gga("Money")]);
            } else {
                const entries = await readGgaEntries("PlayerDATABASE.h", [name], ["Lv0", "Money"]);
                ({ Lv0: levels, Money: money } = unwrapH(entries[name]) ?? {});
            }
            levels = toIndexedArray(levels);
            if (!levels.length || !Number.isFinite(money) || !levels.every(Number.isFinite)) {
                throw new Error("Player data is incomplete. Refresh after entering the game.");
            }
            if ((await gga("UserInfo[0]")) !== active)
                throw new Error("The active character changed. Refresh and try again.");
            current.val = active;
            const fields = [
                { index: null, title: "Money", value: money },
                { index: 0, title: "Main level", value: levels[0] },
            ];
            toIndexedArray(rawSkills)
                .slice(0, 20)
                .forEach((skill, offset) => {
                    const index = offset + 1;
                    if (
                        typeof skill === "string" &&
                        /[a-z]/i.test(skill) &&
                        skill !== "Blank" &&
                        Number.isFinite(levels[index]) &&
                        levels[index] >= 0
                    ) {
                        fields.push({ index, title: `${skill.replace(/_/g, " ")} level`, value: levels[index] });
                    }
                });
            characterSelector.setCharacters(names);
            reconcileRows(JSON.stringify([name, fields.map(({ index, title }) => [index, title])]), () =>
                fields.map(({ index, title }) => renderRow(name, index, title))
            );
            fields.forEach(({ index, value }) => {
                getOrCreateState(values, index).val = value;
            });
            message.val = "";
        });
    };

    load();
    return PersistentAccountListPage({
        title: "PLAYER",
        description:
            "Edit each character's main level, skill levels, and carried money. Money is in copper; K, M, B and scientific notation are accepted. Level changes reset that level's XP progress and update its XP requirement. Talent points are unchanged.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val || busy.val }),
        state: { loading, error },
        loadingText: "READING PLAYER",
        errorTitle: "PLAYER READ FAILED",
        body: div(
            { class: "scrollable-panel content-stack" },
            characterSelector.node,
            div({ class: "write-status", role: "status", "aria-live": "polite" }, message),
            AccountSection({ title: "LEVELS & MONEY", body: rows })
        ),
    });
};
