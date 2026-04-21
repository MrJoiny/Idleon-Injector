/**
 * Account Options Tab
 * Raw game attribute editor (OptionsListAccount).
 * Requires explicit user confirmation before data loads.
 */

import van from "../../../vendor/van-1.6.0.js";
import vanX from "../../../vendor/van-x-0.6.3.js";
import store from "../../../state/store.js";
import { EmptyState } from "../../EmptyState.js";
import { SearchBar } from "../../SearchBar.js";
import { NumberInput } from "../../NumberInput.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { renderAccountLoading, useWriteStatus, writeVerified } from "./accountShared.js";
import { AccountPageShell } from "./components/AccountPageShell.js";
import { WarningBanner } from "./components/AccountPageChrome.js";
import { AccountTabHeader } from "./components/AccountTabHeader.js";

const { div, button, input, label, span, p, h3 } = van.tags;

const valueToDisplay = (type, value) => {
    if (type === "object" && value !== null) return JSON.stringify(value);
    return value;
};

const isSameDisplayList = (a, b) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i].index !== b[i].index) return false;
        if (a[i].schema !== b[i].schema) return false;
    }
    return true;
};

export const AccountOptionsTab = () => {
    const ui = vanX.reactive({
        isUnlocked: false,
        awaitingInitialLoad: false,
        filterText: "",
        hideAI: false,
        displayList: [],
    });
    let lastOptionsRef = null;

    const handleLoad = () => {
        ui.isUnlocked = true;
        if (!store.data.accountOptions.length) {
            ui.awaitingInitialLoad = true;
            store.loadAccountOptions().finally(() => {
                ui.awaitingInitialLoad = false;
            });
        }
    };

    van.derive(() => {
        const data = store.data.accountOptions;
        const schema = store.data.accountSchema;
        const term = ui.filterText.toLowerCase();
        const hide = ui.hideAI;

        if (!data || data.length === 0) {
            ui.displayList = [];
            return;
        }

        const results = [];
        for (let index = 0; index < data.length; index++) {
            const val = data[index];
            const sch = schema[index];

            if (hide && sch && sch.AI) continue;
            if (term) {
                const name = (sch && sch.name ? sch.name : `UNDOCUMENTED ${index}`).toLowerCase();
                if (!name.includes(term) && !index.toString().includes(term)) continue;
            }

            // Keep list entries stable by index/schema for write-state persistence.
            // `val` is included for initial row hydration only.
            results.push({ index, val, schema: sch });
        }
        const optionsRefChanged = lastOptionsRef !== data;
        lastOptionsRef = data;
        if (optionsRefChanged || !isSameDisplayList(ui.displayList, results)) {
            ui.displayList = results;
        }
    });

    if (!ui.isUnlocked) {
        return div(
            { class: "modal-box options-account-modal" },
            div({ class: "modal-header" }, h3(Icons.Warning(), " CRITICAL WARNING")),
            div(
                { class: "modal-body" },
                p("You are entering the Options List Editor"),
                p("Modifying these indices directly bypass game logic safety checks"),
                p("Proceed with caution")
            ),
            div({ class: "modal-footer" }, button({ class: "btn-danger", onclick: handleLoad }, "CONFIRM ACCESS"))
        );
    }

    return AccountPageShell({
        rootClass: "tab-container",
        header: AccountTabHeader({
            title: "ACCOUNT OPTIONS",
            description: "Raw OptionsListAccount editor. Writes bypass normal in-game safety checks.",
        }),
        topNotices: WarningBanner("ACCESSING RAW GAME ATTRIBUTES"),
        subNav: div(
            { class: "control-bar sticky-header" },
            withTooltip(
                button({ class: "btn-secondary", onclick: () => store.loadAccountOptions() }, "REFRESH"),
                "Reload from game memory"
            ),
            withTooltip(
                label(
                    { class: "toggle-switch account-toggle" },
                    input({
                        type: "checkbox",
                        checked: () => ui.hideAI,
                        onchange: (e) => (ui.hideAI = e.target.checked),
                    }),
                    span({ class: "slider" }),
                    span({ class: "label" }, "HIDE AI")
                ),
                "Hide AI-generated options"
            ),
            SearchBar({
                placeholder: "FILTER_INDEX",
                onInput: (val) => (ui.filterText = val),
            })
        ),
        body: () =>
            ui.awaitingInitialLoad || store.app.isLoading
                ? renderAccountLoading()
                : ui.displayList.length === 0
                  ? div(
                        { class: "scrollable-panel" },
                        EmptyState({
                            icon: Icons.SearchX(),
                            title: "NO OPTIONS MATCH",
                            subtitle: "Adjust your filter or search term",
                        })
                    )
                  : div(
                        { class: "scrollable-panel" },
                        ...ui.displayList.map(({ index, val, schema }) => OptionItem(index, val, schema))
                    ),
    });
};

const OptionItem = (index, rawVal, schema) => {
    const type = typeof rawVal;
    const normalizedInit = type === "object" && rawVal !== null ? JSON.stringify(rawVal) : rawVal;

    const currentVal = van.state(normalizedInit);
    const { status, run } = useWriteStatus();

    const handleApply = async () => {
        if (status.val === "loading") return;
        await run(async () => {
            let val = currentVal.val;
            if (type === "number") val = Number(val);
            else if (type === "boolean") val = Boolean(val);
            else if (type === "object") val = JSON.parse(val);

            const path = `OptionsListAccount[${index}]`;
            await writeVerified(path, val);
            store.data.accountOptions[index] = val;
            currentVal.val = valueToDisplay(type, val);
        });
    };

    const name = schema ? schema.name : "UNDOCUMENTED INDEX";
    const desc = schema ? schema.description : null;
    const isAI = schema ? schema.AI : false;
    const warning = schema ? schema.warning : null;

    return div(
        {
            class: () =>
                `option-item feature-card ${isAI ? "is-ai-option" : ""} ${warning ? "has-warning" : ""} ${
                    status.val === "success" ? "account-row--success" : ""
                } ${status.val === "error" ? "account-row--error" : ""}`,
            "data-index": index,
        },
        div(
            { class: "option-header" },
            div({ class: "option-label" }, isAI ? span({ class: "option-ai-label" }, "AI_GEN // ") : null, name),
            div({ class: "option-index" }, `IDX::${index}`)
        ),
        warning ? div({ class: "option-warning" }, Icons.Warning(), ` ${warning}`) : null,
        desc ? div({ class: "option-description" }, desc) : null,
        div(
            { class: "option-input-wrapper" },
            type === "boolean"
                ? input({
                      type: "checkbox",
                      class: "option-input",
                      checked: currentVal,
                      onchange: (e) => (currentVal.val = e.target.checked),
                  })
                : type === "number"
                  ? NumberInput({
                        class: "option-input",
                        value: currentVal,
                        oninput: (e) => (currentVal.val = e.target.value),
                        onDecrement: () => (currentVal.val = Number(currentVal.val) - 1),
                        onIncrement: () => (currentVal.val = Number(currentVal.val) + 1),
                    })
                  : input({
                        type: "text",
                        class: "option-input",
                        value: currentVal,
                        oninput: (e) => (currentVal.val = e.target.value),
                    }),
            withTooltip(
                button(
                    {
                        class: () =>
                            [
                                "option-apply-button",
                                status.val === "success" ? "account-row--success" : "",
                                status.val === "error" ? "account-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                        onclick: handleApply,
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Write to game memory"
            )
        )
    );
};


