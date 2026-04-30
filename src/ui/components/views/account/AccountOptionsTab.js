/**
 * Account Options Tab
 * Raw game attribute editor (OptionsListAccount).
 */

import van from "../../../vendor/van-1.6.0.js";
import vanX from "../../../vendor/van-x-0.6.3.js";
import store from "../../../state/store.js";
import { EmptyState } from "../../EmptyState.js";
import { SearchBar } from "../../SearchBar.js";
import { NumberInput } from "../../NumberInput.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { createStaticRowReconciler, joinClasses, useWriteStatus, writeVerified } from "./accountShared.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";

const { div, input, label, span } = van.tags;

const getOptionType = (rawValue, schema) => schema?.type ?? typeof rawValue;

const valueToDisplay = (type, value) => {
    if (type === "object") return JSON.stringify(value);
    return value;
};

const normalizeForWrite = (type, rawValue) => {
    if (type === "number") {
        const nextValue = Number(rawValue);
        if (Number.isNaN(nextValue)) throw new Error("Invalid number");
        return nextValue;
    }
    if (type === "boolean") return rawValue === true;
    if (type === "object") return JSON.parse(rawValue);
    return rawValue;
};

const createOptionRow = (index, rawValue, schema) => {
    const editorType = van.state(getOptionType(rawValue, schema));
    const currentValue = van.state(valueToDisplay(editorType.val, rawValue));
    const name = van.state(schema?.name ?? "UNDOCUMENTED INDEX");
    const description = van.state(schema?.description ?? null);
    const isAI = van.state(Boolean(schema?.AI));
    const warning = van.state(schema?.warning ?? null);
    const { status, run } = useWriteStatus();
    let isFocused = false;

    const syncFromLoadedValue = (nextRawValue, nextSchema) => {
        const nextType = getOptionType(nextRawValue, nextSchema);

        editorType.val = nextType;
        name.val = nextSchema?.name ?? "UNDOCUMENTED INDEX";
        description.val = nextSchema?.description ?? null;
        isAI.val = Boolean(nextSchema?.AI);
        warning.val = nextSchema?.warning ?? null;

        if (!isFocused) {
            currentValue.val = valueToDisplay(nextType, nextRawValue);
        }
    };

    const applyValue = async () => {
        if (status.val === "loading") return;

        await run(async () => {
            const nextValue = normalizeForWrite(editorType.val, currentValue.val);
            const path = `OptionsListAccount[${index}]`;
            await writeVerified(path, nextValue);
            store.data.accountOptions[index] = nextValue;
            currentValue.val = valueToDisplay(editorType.val, nextValue);
        });
    };

    const renderEditor = () => {
        const type = editorType.val;
        if (type === "boolean") {
            return input({
                type: "checkbox",
                class: "option-input",
                checked: currentValue,
                onchange: (e) => (currentValue.val = e.target.checked),
            });
        }

        if (type === "number") {
            return NumberInput({
                class: "option-input",
                value: currentValue,
                oninput: (e) => (currentValue.val = e.target.value),
                onDecrement: () => (currentValue.val = Number(currentValue.val) - 1),
                onIncrement: () => (currentValue.val = Number(currentValue.val) + 1),
            });
        }

        return input({
            type: "text",
            class: "option-input",
            value: currentValue,
            oninput: (e) => (currentValue.val = e.target.value),
        });
    };

    const node = div(
        {
            class: () =>
                joinClasses(
                    "option-item feature-card",
                    isAI.val ? "is-ai-option" : "",
                    warning.val ? "has-warning" : "",
                    status.val === "success" ? "account-row--success" : "",
                    status.val === "error" ? "account-row--error" : ""
                ),
            "data-index": index,
        },
        div(
            { class: "option-header" },
            div(
                { class: "option-label" },
                () => (isAI.val ? span({ class: "option-ai-label" }, "AI_GEN // ") : null),
                () => name.val
            ),
            div({ class: "option-index" }, `IDX::${index}`)
        ),
        () => (warning.val ? div({ class: "option-warning" }, Icons.Warning(), ` ${warning.val}`) : null),
        () => (description.val ? div({ class: "option-description" }, description.val) : null),
        div(
            {
                class: "option-input-wrapper",
                onfocusin: () => {
                    isFocused = true;
                },
                onfocusout: (e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    isFocused = false;
                    currentValue.val = valueToDisplay(editorType.val, store.data.accountOptions[index]);
                },
            },
            () => renderEditor(),
            ActionButton({
                label: "SET",
                status,
                className: "option-apply-button",
                tooltip: "Write to game memory",
                onClick: (e) => {
                    e.preventDefault();
                    applyValue();
                },
            })
        )
    );

    syncFromLoadedValue(rawValue, schema);
    return { node, syncFromLoadedValue };
};

export const AccountOptionsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Account options" });
    const ui = vanX.reactive({
        filterText: "",
        hideAI: false,
    });
    const rowCache = new Map();
    const optionsListNode = div({ class: "scrollable-panel" });
    const reconcileOptionRows = createStaticRowReconciler(optionsListNode);

    const getOptionRow = (index, rawValue, schema) => {
        if (!rowCache.has(index)) rowCache.set(index, createOptionRow(index, rawValue, schema));
        const row = rowCache.get(index);
        row.syncFromLoadedValue(rawValue, schema);
        return row;
    };

    const reconcileVisibleRows = () => {
        const data = store.data.accountOptions;
        const schema = store.data.accountSchema;
        const term = ui.filterText.toLowerCase();
        const visibleRows = [];
        const visibleIndexes = [];

        for (let index = 0; index < data.length; index++) {
            const rawValue = data[index];
            const optionSchema = schema[index];

            if (ui.hideAI && optionSchema?.AI) continue;
            if (term) {
                const optionName = (optionSchema?.name ?? `UNDOCUMENTED ${index}`).toLowerCase();
                if (!optionName.includes(term) && !String(index).includes(term)) continue;
            }

            visibleRows.push(getOptionRow(index, rawValue, optionSchema).node);
            visibleIndexes.push(index);
        }

        reconcileOptionRows(
            visibleIndexes.join("|"),
            visibleRows.length
                ? visibleRows
                : [
                      EmptyState({
                          icon: Icons.SearchX(),
                          title: "NO OPTIONS MATCH",
                          subtitle: "Adjust your filter or search term",
                      }),
                  ]
        );
    };

    const loadAccountOptions = async () => {
        await run(async () => {
            await store.loadAccountOptions();
            reconcileVisibleRows();
        });
    };

    van.derive(reconcileVisibleRows);
    loadAccountOptions();

    return PersistentAccountListPage({
        rootClass: "tab-container",
        title: "ACCOUNT OPTIONS",
        description: "Raw OptionsListAccount editor. Writes bypass normal in-game safety checks.",
        actions: RefreshButton({
            onRefresh: loadAccountOptions,
            tooltip: "Reload from game memory",
        }),
        subNav: div(
            { class: "control-bar sticky-header" },
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
        state: { loading, error },
        loadingText: "READING ACCOUNT OPTIONS",
        errorTitle: "ACCOUNT OPTIONS READ FAILED",
        body: optionsListNode,
    });
};
