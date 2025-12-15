import van from '../../van-1.6.0.js';
import store from '../../store.js';

const { div, label, input, details, summary, span, button } = van.tags;

export const ConfigNode = ({ data, path = "", fullDraft }) => {
    return Object.keys(data).map(key => {
        const value = data[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return details({ class: 'cheat-category' },
                summary(key),
                div({ class: 'cheat-category-content' },
                    ConfigNode({
                        data: value,
                        path: currentPath,
                        fullDraft: fullDraft
                    })
                )
            );
        }
        return ConfigItem({ key, initialValue: value, fullPath: currentPath, fullDraft });
    });
};

const ConfigItem = ({ key, initialValue, fullPath, fullDraft }) => {
    const currentVal = van.state(initialValue);

    const getDefault = () => {
        const defaults = store.config.val?.defaultConfig;
        if (!defaults) return undefined;
        return fullPath.split('.').reduce((acc, k) => (acc && acc[k] !== undefined) ? acc[k] : undefined, defaults);
    };

    const isModified = van.derive(() => {
        const def = getDefault();
        const curr = currentVal.val;
        if (def === undefined) return false;
        if (typeof def === 'number') return Number(curr) !== Number(def);
        return JSON.stringify(curr) !== JSON.stringify(def);
    });

    const handleInput = (rawVal) => {
        const def = getDefault();
        const targetType = typeof (initialValue ?? def);
        let val = rawVal;

        if (targetType === 'number') {
            val = parseFloat(rawVal);
            if (isNaN(val)) val = rawVal;
        } else if (targetType === 'boolean') {
            val = Boolean(rawVal);
        }

        currentVal.val = val;

        const keys = fullPath.split('.');
        let current = fullDraft;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = val;
    };

    const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
    const type = typeof (initialValue ?? getDefault() ?? 'string');
    const defaultVal = getDefault();

    return div({
        class: () => `config-item ${isModified.val ? 'modified-config' : ''}`,
        'data-config-key': fullPath
    },
        label(displayKey),

        (type === 'boolean')
            ? label({ class: 'toggle-switch' },
                input({
                    type: 'checkbox',
                    checked: currentVal,
                    onchange: e => handleInput(e.target.checked)
                }),
                span({ class: 'slider' }),
                span({ class: 'label' }, () => currentVal.val ? 'ENABLED' : 'DISABLED')
            )
            : (type === 'number')
                ? div({ class: 'number-input-wrapper' },
                    button({
                        class: 'number-input-btn',
                        onclick: () => handleInput(Number(currentVal.val) - 1)
                    }, "-"),
                    input({
                        type: 'number',
                        value: currentVal,
                        oninput: e => handleInput(e.target.value),
                        style: 'width: 100%;'
                    }),
                    button({
                        class: 'number-input-btn',
                        onclick: () => handleInput(Number(currentVal.val) + 1)
                    }, "+")
                )
                : input({
                    type: 'text',
                    value: currentVal,
                    oninput: e => handleInput(e.target.value),
                    style: 'width: 100%;'
                }),

        // CLEANUP: Uses CSS class for style, only manages visibility here
        div({
            class: 'default-value-hint',
            style: () => isModified.val ? 'display: block;' : 'display: none;'
        }, `Default: ${JSON.stringify(defaultVal)}`)
    );
};