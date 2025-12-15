import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { NumberInput } from '../NumberInput.js';

const { div, label, input, details, summary, span, button } = van.tags;

// Data is now a Reactive Object (from VanX)
export const ConfigNode = ({ data, path = "", template = null }) => {
    // If template is provided, use it for structure (keys and type checking)
    // Otherwise fallback to data (which might be reactive)
    const source = template || data;
    const keys = Object.keys(source);

    return keys.map(key => {
        // We use the template (source) for structure/recursion checks to avoid valid reactive reads
        const value = source[key];
        const currentPath = path ? `${path}.${key}` : key;

        // If it's an object (and not null/array), we recurse
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {

            // Check if this entire category subtree is modified compared to defaults
            const isCategoryModified = van.derive(() => {
                const defaults = store.app.config?.defaultConfig;
                if (!defaults) return false;

                // Resolve default value at this path
                // Note: currentPath is dot-separated e.g. "cheatConfig.GodMode"
                const defaultSub = currentPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults);

                // Deep compare current reactive proxy vs default object
                const currentSub = data[key];

                // If defaults are missing for this section, assume not modified (or modified? safety: false)
                if (defaultSub === undefined) return false;

                return JSON.stringify(currentSub) !== JSON.stringify(defaultSub);
            });

            return details({
                class: () => `cheat-category ${isCategoryModified.val ? 'modified-category' : ''}`
            },
                summary(key),
                div({ class: 'cheat-category-content' },
                    ConfigNode({
                        data: data[key], // Pass sub-proxy for binding
                        path: currentPath,
                        template: template ? template[key] : null // Pass sub-template
                    })
                )
            );
        }

        // Render leaf node
        // Pass initialValue from template to avoid reading data[key] during render
        return ConfigItem({
            data,
            key,
            fullPath: currentPath,
            initialValue: value
        });
    });
};

const ConfigItem = ({ data, key, fullPath, initialValue }) => {
    // data is the PARENT object, key is the property
    // We bind directly to data[key]

    // Determine type from initial value (passed from template) or default
    const isArray = Array.isArray(initialValue);

    // Get default value for diffing
    const defaults = store.app.config?.defaultConfig;
    const defaultVal = defaults ? fullPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults) : undefined;

    // Derived state for modification check
    const isModified = van.derive(() => {
        const curr = data[key];
        if (defaultVal === undefined) return false;
        if (typeof defaultVal === 'number') return Number(curr) !== Number(defaultVal);
        return JSON.stringify(curr) !== JSON.stringify(defaultVal);
    });

    const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
    const type = isArray ? 'array' : typeof (initialValue ?? defaultVal ?? 'string');

    // LOCAL STATE for all text-based inputs to prevent cursor reset issues
    // The input maintains its own state during typing, only syncing when:
    // 1. The input loses focus (onblur)
    // 2. External changes occur (detected via van.derive when not focused)

    const getStringValue = (val) => {
        if (isArray || Array.isArray(val)) return JSON.stringify(val);
        return String(val ?? '');
    };

    const localTextState = van.state(getStringValue(initialValue));
    const isFocused = van.state(false);

    // Sync local state from store when not focused
    van.derive(() => {
        const storeVal = data[key];
        if (!isFocused.val) {
            const newStr = getStringValue(storeVal);
            if (newStr !== localTextState.val) {
                localTextState.val = newStr;
            }
        }
    });

    // Handle committing the value to the store
    const commitValue = (rawVal) => {
        let val = rawVal;
        const targetType = isArray ? 'array' : typeof (initialValue ?? defaultVal);

        if (targetType === 'number') {
            val = parseFloat(rawVal);
            if (isNaN(val)) val = rawVal;
        } else if (targetType === 'boolean') {
            val = Boolean(rawVal);
        } else if (targetType === 'array') {
            try {
                const parsed = JSON.parse(rawVal);
                if (Array.isArray(parsed)) val = parsed;
            } catch {
                // keep the raw string if invalid JSON
            }
        }

        // Direct assignment to reactive object
        data[key] = val;
    };

    // Event handlers
    const handleFocus = () => { isFocused.val = true; };
    const handleBlur = (e) => {
        isFocused.val = false;
        commitValue(e.target.value);
    };
    const handleInput = (e) => {
        localTextState.val = e.target.value;
        // For numbers and arrays, also update store immediately for +/- buttons to work
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
                    onchange: e => {
                        data[key] = e.target.checked;
                    }
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
                            // Commit on every input for string fields
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