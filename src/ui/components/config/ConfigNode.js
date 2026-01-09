import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { NumberInput } from '../NumberInput.js';
import { FunctionInput } from '../FunctionInput.js';
import { Icons } from '../../icons.js';
import { withTooltip } from '../Tooltip.js';
import { isFunction } from '../../utils/functionParser.js';
import { configDescriptions } from '../../configDescriptions.js';

const { div, label, input, details, summary, span, button } = van.tags;

/**
 * Optimized Deep/Loose Equality Check
 * Prevents expensive JSON.stringify on primitives and handles number/string coercion.
 */
const areValuesEqual = (a, b) => {
    // Identity check (covers undefined/null/same ref)
    if (a === b) return true;

    // Null handling (one is null, the other isn't, because of step 1)
    if (a === null || b === null) return false;

    // 3. Numeric Coercion Check (matches NumberInput behavior)
    // If either is a number, try to compare as numbers
    if (typeof a === 'number' || typeof b === 'number') {
        return Number(a) === Number(b);
    }

    // Type mismatch (non-numbers)
    if (typeof a !== typeof b) return false;

    // Primitives (String, Boolean) - Strict equality
    if (typeof a !== 'object') {
        return a === b;
    }

    // Deep Comparison (Arrays/Objects)
    // We fall back to JSON.stringify here as it's stable enough for config objects
    // and safer than writing a custom recursive deepEqual for this context.
    return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * Helper function to check if a category or any of its children match the search term
 */
const hasMatchingChildren = (obj, searchTerm) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    for (const key of Object.keys(obj)) {
        // Check if key matches
        if (key.toLowerCase().includes(term)) return true;

        const value = obj[key];
        // Recurse into nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (hasMatchingChildren(value, searchTerm)) return true;
        }
    }
    return false;
};

export const ConfigNode = ({ data, path = "", template = null, searchTerm = "" }) => {
    const source = template || data;
    const keys = Object.keys(source);
    const termLower = searchTerm.toLowerCase();

    return keys.map(key => {
        const value = source[key];
        const currentPath = path ? `${path}.${key}` : key;

        // Recursive Case: Object (and not null/array)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Check if this category or any children match the search
            const categoryMatches = !termLower || key.toLowerCase().includes(termLower);
            const childrenMatch = hasMatchingChildren(data[key] || {}, searchTerm);

            // Hide categories with no matching content
            if (termLower && !categoryMatches && !childrenMatch) {
                return null;
            }

            const isCategoryModified = van.derive(() => {
                const defaults = store.app.config?.defaultConfig;
                if (!defaults) return false;

                // Resolve default value at this path
                const defaultSub = currentPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults);

                // Reactive dependency on the specific sub-tree
                const currentSub = data[key];

                if (defaultSub === undefined) return false;

                // Optimized comparison
                return !areValuesEqual(currentSub, defaultSub);
            });

            // Auto-expand when searching
            const shouldAutoExpand = termLower && (categoryMatches || childrenMatch);

            return details({
                class: () => `cheat-category ${isCategoryModified.val ? 'modified-category' : ''}`,
                open: shouldAutoExpand || undefined
            },
                summary(key),
                div({ class: 'cheat-category-content' },
                    ConfigNode({
                        data: data[key],
                        path: currentPath,
                        template: template ? template[key] : null,
                        searchTerm
                    })
                )
            );
        }

        // Leaf Case - check if key matches search
        const matchesSearch = !termLower || key.toLowerCase().includes(termLower);
        if (!matchesSearch) {
            return null;
        }

        return ConfigItem({
            data,
            key,
            fullPath: currentPath,
            initialValue: value
        });
    });
};

const ConfigItem = ({ data, key, fullPath, initialValue }) => {
    // Determine type - check for function first
    const isArray = Array.isArray(initialValue);
    const isFn = isFunction(initialValue);

    // Get default value
    const defaults = store.app.config?.defaultConfig;
    const defaultVal = defaults ? fullPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults) : undefined;

    // For functions, compare the string representation
    const getFunctionString = (val) => {
        if (typeof val === 'function') return val.toString();
        if (typeof val === 'string' && isFunction(val)) return val;
        return String(val ?? '');
    };

    // Optimized Modification Check
    const isModified = van.derive(() => {
        const curr = data[key];
        if (defaultVal === undefined) return false;

        // For functions, compare string representations
        if (isFn || isFunction(curr) || isFunction(defaultVal)) {
            return getFunctionString(curr) !== getFunctionString(defaultVal);
        }

        // Use the centralized helper for non-functions
        return !areValuesEqual(curr, defaultVal);
    });

    const displayKey = key;
    const description = configDescriptions[fullPath] || '';
    // Determine the display type
    const type = isFn ? 'function' : isArray ? 'array' : typeof (initialValue ?? defaultVal ?? 'string');

    // Local state logic remains the same (Corrects cursor jumping issues)
    const getStringValue = (val) => {
        if (isArray || Array.isArray(val)) return JSON.stringify(val);
        if (typeof val === 'function') return val.toString();
        return String(val ?? '');
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
        const targetType = isFn ? 'function' : isArray ? 'array' : typeof (initialValue ?? defaultVal);

        if (targetType === 'number') {
            val = parseFloat(rawVal);
            if (isNaN(val)) val = rawVal; // Keep raw if invalid number
        } else if (targetType === 'boolean') {
            val = Boolean(rawVal);
        } else if (targetType === 'array') {
            try {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) val = parsed;
            } catch {
                // Ignore invalid JSON array input
            }
        }
        // For functions and strings, store as-is (string)
        data[key] = val;
    };

    const handleFocus = () => { isFocused.val = true; };
    const handleBlur = (e) => {
        isFocused.val = false;
        commitValue(e.target.value);
    };
    const handleInput = (e) => {
        localTextState.val = e.target.value;
        if (type === 'number' || type === 'array') {
            commitValue(e.target.value);
        }
    };

    // Handler for FunctionInput changes
    const handleFunctionChange = (newFnString) => {
        data[key] = newFnString;
        localTextState.val = newFnString;
    };

    // Get display string for default value
    const getDefaultDisplayString = () => {
        if (isFunction(defaultVal)) {
            return getFunctionString(defaultVal);
        }
        return JSON.stringify(defaultVal);
    };

    return div({
        class: () => `config-item ${isModified.val ? 'modified-config' : ''}`,
        'data-config-key': fullPath
    },
        div({ class: 'config-item-header' },
            label(displayKey),
            description ? span({ class: 'config-description' }, description) : null,
            withTooltip(
                button({
                    class: 'config-reset-btn',
                    style: () => isModified.val ? 'display: inline-flex;' : 'display: none;',
                    onclick: () => {
                        if (isFn && typeof defaultVal === 'function') {
                            // Store the function string representation
                            data[key] = defaultVal.toString();
                        } else {
                            data[key] = defaultVal;
                        }
                        localTextState.val = getStringValue(defaultVal);
                    }
                }, Icons.Refresh()),
                'Reset to default'
            )
        ),

        (type === 'function')
            ? FunctionInput({
                data: data,
                dataKey: key,
                initialValue: initialValue
            })
            : (type === 'boolean')
                ? label({ class: 'toggle-switch' },
                    input({
                        type: 'checkbox',
                        checked: () => data[key],
                        onchange: e => data[key] = e.target.checked
                    }),
                    span({ class: 'slider' }),
                    span({ class: 'label' }, () => data[key] ? 'ENABLED' : 'DISABLED')
                )
                : (type === 'number')
                    ? NumberInput({
                        value: localTextState,
                        onfocus: handleFocus,
                        onblur: handleBlur,
                        oninput: handleInput,
                        onDecrement: () => {
                            const newVal = Number(data[key]) - 1;
                            data[key] = newVal;
                            localTextState.val = String(newVal);
                        },
                        onIncrement: () => {
                            const newVal = Number(data[key]) + 1;
                            data[key] = newVal;
                            localTextState.val = String(newVal);
                        }
                    })
                    : (type === 'array')
                        ? input({
                            type: 'text',
                            name: fullPath,
                            value: localTextState,
                            placeholder: '[]',
                            onfocus: handleFocus,
                            onblur: handleBlur,
                            oninput: handleInput,
                            style: 'width: 100%;'
                        })
                        : input({
                            type: 'text',
                            value: localTextState,
                            onfocus: handleFocus,
                            onblur: handleBlur,
                            oninput: (e) => {
                                localTextState.val = e.target.value;
                                commitValue(e.target.value);
                            },
                            style: 'width: 100%;'
                        }),

        div({
            class: 'default-value-hint',
            style: () => isModified.val ? 'display: block;' : 'display: none;'
        }, () => `Default: ${getDefaultDisplayString()}`)
    );
};