import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { NumberInput } from '../NumberInput.js';

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

export const ConfigNode = ({ data, path = "", template = null }) => {
    const source = template || data;
    const keys = Object.keys(source);

    return keys.map(key => {
        const value = source[key];
        const currentPath = path ? `${path}.${key}` : key;

        // Recursive Case: Object (and not null/array)
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {

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

            return details({
                class: () => `cheat-category ${isCategoryModified.val ? 'modified-category' : ''}`
            },
                summary(key),
                div({ class: 'cheat-category-content' },
                    ConfigNode({
                        data: data[key],
                        path: currentPath,
                        template: template ? template[key] : null
                    })
                )
            );
        }

        // Leaf Case
        return ConfigItem({
            data,
            key,
            fullPath: currentPath,
            initialValue: value
        });
    });
};

const ConfigItem = ({ data, key, fullPath, initialValue }) => {
    // Determine type
    const isArray = Array.isArray(initialValue);

    // Get default value
    const defaults = store.app.config?.defaultConfig;
    const defaultVal = defaults ? fullPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults) : undefined;

    // Optimized Modification Check
    const isModified = van.derive(() => {
        const curr = data[key];
        if (defaultVal === undefined) return false;

        // Use the centralized helper
        return !areValuesEqual(curr, defaultVal);
    });

    const displayKey = key;
    // Fallback to 'string' if initialValue is null/undefined to prevent crashes
    const type = isArray ? 'array' : typeof (initialValue ?? defaultVal ?? 'string');

    // Local state logic remains the same (Corrects cursor jumping issues)
    const getStringValue = (val) => {
        if (isArray || Array.isArray(val)) return JSON.stringify(val);
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
        const targetType = isArray ? 'array' : typeof (initialValue ?? defaultVal);

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

    return div({
        class: () => `config-item ${isModified.val ? 'modified-config' : ''}`,
        'data-config-key': fullPath
    },
        label(displayKey),

        (type === 'boolean')
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
        }, `Default: ${JSON.stringify(defaultVal)}`)
    );
};