import van from "../../../vendor/van-1.6.0.js";
import { deleteGga, gga, readCList } from "../../../services/api.js";
import { toIndexedArray } from "../../../utils/index.js";
import { formatNumber, formattedStep } from "../../../utils/numberFormat.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { createBubbaSections } from "./bubbaFields.js";
import {
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    writeVerified,
} from "./accountShared.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
import { AccountSection } from "./components/AccountSection.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";

const { div, span } = van.tags;

export const BubbaTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Bubba" });
    const writeError = van.state("");
    const states = new Map();
    const body = div({ class: "account-list" });
    const reconcile = createStaticRowReconciler(body);
    let writes = Promise.resolve();

    const row = (field) => {
        const valueState = getOrCreateState(states, field.path, undefined);
        const normalize = (raw) => {
            const value = resolveNumberInput(raw, {
                formatted: field.formatted,
                float: field.float,
                min: field.min,
                max: field.max,
            });
            return Number.isFinite(value) ? value : null;
        };
        return EditableNumberRow({
            valueState,
            normalize,
            disabled: () => loading.val || Boolean(error.val),
            write: (value) => {
                const task = writes.then(async () => {
                    writeError.val = "";
                    let saved = false;
                    try {
                        if (field.group === 0 && (field.index === 2 || field.index === 3) && value !== 0) {
                            const other = await gga(`Bubba[0][${field.index === 2 ? 3 : 2}]`);
                            if (Number(other) === value) throw new Error("Choose different gifts for the two slots.");
                        }
                        await writeVerified(field.path, value);
                        saved = true;
                        valueState.val = value;
                        if (field.group === 1 || field.group === 2) {
                            // TotalQTYofLVs otherwise keeps returning the old cached upgrade sum.
                            await deleteGga("DNSM.h.Bubba_LVzAll");
                        }
                        return value;
                    } catch (caught) {
                        writeError.val = saved
                            ? `${field.name} was saved, but its cached total could not be refreshed. ${caught.message}`
                            : `${field.name}: ${caught.message}`;
                        throw caught;
                    }
                });
                writes = task.catch(() => {});
                return task;
            },
            renderInfo: () => [
                span({ class: "account-row__name" }, field.name),
                field.subLabel ? span({ class: "account-row__sub-label" }, field.subLabel) : null,
            ],
            renderBadge: (value) => (value === undefined ? "—" : field.formatted ? formatNumber(value) : String(value)),
            inputMode: field.float ? "float" : "int",
            inputProps: {
                "aria-label": field.group === 2 ? `${field.name} free levels` : field.name,
                ...(field.formatted ? { formatter: largeFormatter, parser: largeParser } : {}),
            },
            adjustInput: (raw, delta) => {
                const value = normalize(raw) ?? 0;
                const step = field.formatted ? formattedStep(value) : field.float ? 0.1 : 1;
                return Math.max(field.min, Math.min(field.max, value + delta * step));
            },
            controlsClass: "account-row__controls--xl",
            renderExtraActions: ({ status }) =>
                span({ role: "status", "aria-live": "polite", class: "write-status" }, () =>
                    status.val === "loading"
                        ? `Saving ${field.name}`
                        : status.val === "success"
                          ? `${field.name} saved`
                          : status.val === "error"
                            ? `${field.name} failed`
                            : ""
                ),
        });
    };

    const load = () =>
        run(async () => {
            await writes;
            const [raw, rawUpgrades, rawTraits, rawGifts, rawSmoke] = await Promise.all([
                gga("Bubba"),
                readCList("BubbaUpg"),
                readCList("Spelunky[36]"),
                readCList("Spelunky[39]"),
                readCList("Spelunky[34]"),
            ]);
            const data = toIndexedArray(raw).map(toIndexedArray);
            const lengths = [20, 28, 28, 6, 8, 5];
            if (data.length !== lengths.length || data.some((values, index) => values.length !== lengths[index])) {
                throw new Error("Unsupported Bubba save data");
            }
            const sections = createBubbaSections(
                toIndexedArray(rawUpgrades).map(toIndexedArray),
                toIndexedArray(rawTraits),
                toIndexedArray(rawGifts),
                toIndexedArray(rawSmoke)
            );
            for (const field of sections.flatMap((section) => section.fields)) {
                const value = Number(data[field.group][field.index]);
                if (!Number.isFinite(value)) throw new Error(`Invalid saved value for ${field.name}`);
                getOrCreateState(states, field.path).val = value;
            }
            reconcile(JSON.stringify(sections), () =>
                sections.map((section) =>
                    AccountSection({
                        title: section.title,
                        note: section.note,
                        body: section.fields.map(row),
                    })
                )
            );
        });

    load();
    return PersistentAccountListPage({
        title: "BUBBA",
        description: "Set Bubba resources, upgrades, and progress.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        topNotices: div(
            WarningBanner(
                "Setting values does not purchase upgrades or reset the run. Reopen Bubba in game to refresh its display."
            ),
            div({ role: "alert" }, () => writeError.val)
        ),
        state: { loading, error },
        loadingText: "READING BUBBA",
        errorTitle: "BUBBA READ FAILED",
        body,
    });
};
