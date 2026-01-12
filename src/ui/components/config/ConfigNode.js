import van from "../../van-1.6.0.js";
import store from "../../store.js";
import { NumberInput } from "../NumberInput.js";
import { FunctionInput } from "../FunctionInput.js";
import { Icons } from "../../icons.js";
import { withTooltip } from "../Tooltip.js";
import { isFunction } from "../../utils/functionParser.js";
import { configDescriptions } from "../../configDescriptions.js";

const { div, label, input, details, summary, span, button } = van.tags;

/**
 * Resolves a dot-separated path to a value in an object.
 */
const resolvePath = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split(".").reduce(
        (acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined),
        obj
    );
};

/**
 * Optimized Deep/Loose Equality Check
 * Prevents expensive JSON.stringify on primitives and handles number/string coercion.
 */
const areValuesEqual = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null) return false;

    // Numeric coercion to match NumberInput behavior
    if (typeof a === "number" || typeof b === "number") {
        return Number(a) === Number(b);
    }

    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    // JSON.stringify for deep comparison - stable enough for config objects
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Helper function to check if a category or any of its children match the search term
 */
const hasMatchingChildren = (obj, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    for (const key of Object.keys(obj)) {
        if (key.toLowerCase().includes(term)) return true;

        const value = obj[key];
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            if (hasMatchingChildren(value, searchTerm)) return true;
        }
    }
    return false;
};

export const ConfigNode = ({ data, path = "", template = null, searchTerm = "" }) => {
    const source = template || data;
    const keys = Object.keys(source);
    const termLower = searchTerm.toLowerCase();

    return keys.map((key) => {
        const value = source[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            const categoryMatches = !termLower || key.toLowerCase().includes(termLower);
            const childrenMatch = hasMatchingChildren(data[key] || {}, searchTerm);

            if (termLower && !categoryMatches && !childrenMatch) {
                return null;
            }

            const isCategoryModified = van.derive(() => {
                const defaults = store.app.config?.defaultConfig;
                if (!defaults) return false;

                // Resolve nested path to get default value for comparison
                const defaultSub = resolvePath(defaults, currentPath);

                const currentSub = data[key];

                if (defaultSub === undefined) return false;

                return !areValuesEqual(currentSub, defaultSub);
            });

            // Auto-expand when searching
            const shouldAutoExpand = termLower && (categoryMatches || childrenMatch);

            return details(
                {
                    class: () => `cheat-category ${isCategoryModified.val ? "modified-category" : ""}`,
                    open: shouldAutoExpand || undefined,
                },
                summary(key),
                div(
                    { class: "cheat-category-content" },
                    ConfigNode({
                        data: data[key],
                        path: currentPath,
                        template: template ? template[key] : null,
                        searchTerm,
                    })
                )
            );
        }

        const matchesSearch = !termLower || key.toLowerCase().includes(termLower);
        if (!matchesSearch) {
            return null;
        }

        return ConfigItem({ data, key, fullPath: currentPath, initialValue: value });
    });
};

const ConfigItem = ({ data, key, fullPath, initialValue }) => {
    const isArray = Array.isArray(initialValue);
    const isFn = isFunction(initialValue);

    const defaults = store.app.config?.defaultConfig;
    const defaultVal = defaults ? resolvePath(defaults, fullPath) : undefined;

    const getFunctionString = (val) => {
        if (typeof val === "function") return val.toString();
        if (typeof val === "string" && isFunction(val)) return val;
        return String(val ?? "");
    };

    const isModified = van.derive(() => {
        const curr = data[key];
        if (defaultVal === undefined) return false;

        if (isFn || isFunction(curr) || isFunction(defaultVal)) {
            return getFunctionString(curr) !== getFunctionString(defaultVal);
        }

        return !areValuesEqual(curr, defaultVal);
    });

    const description = configDescriptions[fullPath] || "";

    const type = isFn ? "function" : isArray ? "array" : typeof (initialValue ?? defaultVal ?? "string");

    // Prevents cursor jumping by using local state synced via van.derive with focus guards
    const getStringValue = (val) => {
        if (isArray || Array.isArray(val)) return JSON.stringify(val);
        if (typeof val === "function") return val.toString();
        return String(val ?? "");
    };

    const localTextState = van.state(getStringValue(initialValue));
    const isFocused = van.state(false);

    van.derive(() => {
        const storeVal = data[key];
        if (!isFocused.val) {
            const newStr = getStringValue(storeVal);
            if (newStr !== localTextState.val) {
                localTextState.val = newStr;
            }
        }
    });

    const commitValue = (rawVal) => {
        let val = rawVal;
        const targetType = isFn ? "function" : isArray ? "array" : typeof (initialValue ?? defaultVal);

        if (targetType === "number") {
            val = parseFloat(rawVal);
            if (isNaN(val)) val = rawVal; // Keep raw if invalid number
        } else if (targetType === "boolean") {
            val = Boolean(rawVal);
        } else if (targetType === "array") {
            try {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) val = parsed;
            } catch {}
        }
        data[key] = val;
    };

    const handleFocus = () => {
        isFocused.val = true;
    };
    const handleBlur = (e) => {
        isFocused.val = false;
        commitValue(e.target.value);
    };
    const handleInput = (e) => {
        localTextState.val = e.target.value;
        if (type === "number" || type === "array") {
            commitValue(e.target.value);
        }
    };

    const handleNumberDelta = (delta) => {
        const newVal = Number(data[key]) + delta;
        data[key] = newVal;
        localTextState.val = String(newVal);
    };

    const handleFunctionChange = (newFnString) => {
        data[key] = newFnString;
        localTextState.val = newFnString;
    };


    const getDefaultDisplayString = () => {
        if (isFunction(defaultVal)) {
            return getFunctionString(defaultVal);
        }
        return JSON.stringify(defaultVal);
    };

    const renderInputByType = () => {
        switch (type) {
            case "function":
                return FunctionInput({ data, dataKey: key, initialValue });
            case "boolean":
                return label(
                    { class: "toggle-switch" },
                    input({
                        type: "checkbox",
                        checked: () => data[key],
                        onchange: (e) => (data[key] = e.target.checked),
                    }),
                    span({ class: "slider" }),
                    span({ class: "label" }, () => (data[key] ? "ENABLED" : "DISABLED"))
                );
            case "number":
                return NumberInput({
                    value: localTextState,
                    onfocus: handleFocus,
                    onblur: handleBlur,
                    oninput: handleInput,
                    onDecrement: () => handleNumberDelta(-1),
                    onIncrement: () => handleNumberDelta(1),
                });
            case "array":
                return input({
                    type: "text",
                    name: fullPath,
                    value: localTextState,
                    placeholder: "[]",
                    onfocus: handleFocus,
                    onblur: handleBlur,
                    oninput: handleInput,
                });
            default:
                return input({
                    type: "text",
                    value: localTextState,
                    onfocus: handleFocus,
                    onblur: handleBlur,
                    oninput: (e) => {
                        localTextState.val = e.target.value;
                        commitValue(e.target.value);
                    },
                });
        }
    };

    return div(
        {
            class: () => `config-item ${isModified.val ? "modified-config" : ""}`,
            "data-config-key": fullPath,
        },
        div(
            { class: "config-item-header" },
            label(key),
            description ? span({ class: "config-description" }, description) : null,
            withTooltip(
                button(
                    {
                        class: () => `config-reset-btn ${isModified.val ? "" : "hidden"}`,

                        onclick: () => {
                            if (isFn && typeof defaultVal === "function") {
                                data[key] = defaultVal.toString();
                            } else {
                                data[key] = defaultVal;
                            }
                            localTextState.val = getStringValue(defaultVal);
                        },
                    },
                    Icons.Refresh()
                ),
                "Reset to default"
            )
        ),

        renderInputByType(),

        div(
            { class: () => `default-value-hint ${isModified.val ? "" : "hidden"}` },
            () => `Default: ${getDefaultDisplayString()}`
        )
    );
};

