import van from '../van-1.6.0.js';
import {
    parseFunction,
    generateFunctionString,
    FUNCTION_TYPES,
    FUNCTION_TYPE_LABELS,
    FUNCTION_TYPE_NAMES,
    getSliderConfig,
    getPresetValues
} from '../utils/functionParser.js';

const { div, select, option, input, button, span } = van.tags;

/**
 * FunctionInput - A specialized input component for editing function config values
 * 
 * @param {Object} props
 * @param {Object} props.data - The reactive data object containing the value
 * @param {string} props.dataKey - The key in data object to read/write
 * @param {Function|string} props.initialValue - The initial function value (for parsing)
 */
export const FunctionInput = ({ data, dataKey, initialValue }) => {
    const parsed = parseFunction(initialValue);

    const currentType = van.state(parsed.type);
    const currentValue = van.state(parsed.value ?? 1);
    const rawSource = van.state(parsed.source);

    // Prevents cursor jumping by using local state synced via van.derive with focus guards
    const localNumberText = van.state(String(parsed.value ?? 1));

    const isFocused = van.state(false);

    van.derive(() => {
        if (isFocused.val) return;

        const externalVal = data[dataKey];
        const externalParsed = parseFunction(externalVal);

        if (externalParsed.source !== rawSource.val) {
            currentType.val = externalParsed.type;
            currentValue.val = externalParsed.value ?? 1;
            localNumberText.val = String(externalParsed.value ?? 1);
            rawSource.val = externalParsed.source;
        }
    });

    const emitChange = (type, val) => {
        if (type === FUNCTION_TYPES.COMPLEX) {
            data[dataKey] = rawSource.val;
        } else {
            const fnString = generateFunctionString(type, val);
            rawSource.val = fnString;
            data[dataKey] = fnString;
        }
    };

    const handleTypeChange = (e) => {
        const newType = e.target.value;
        const oldType = currentType.val;
        currentType.val = newType;

        if (newType === FUNCTION_TYPES.COMPLEX) {
        } else {
            if (newType === FUNCTION_TYPES.PASSTHROUGH) {
                // Don't reset currentValue - keep it for when switching back
            } else if (currentValue.val === null || currentValue.val === undefined || oldType === FUNCTION_TYPES.PASSTHROUGH) {
                const defaultVal = newType === FUNCTION_TYPES.FIXED ? 0 :
                    (newType === FUNCTION_TYPES.MIN || newType === FUNCTION_TYPES.MAX) ? 100 : 2;
                currentValue.val = defaultVal;
                localNumberText.val = String(defaultVal);
            }
            emitChange(newType, currentValue.val);
        }
    };

    const handleSliderChange = (e) => {
        const val = parseFloat(e.target.value);
        currentValue.val = val;
        localNumberText.val = String(val);
        emitChange(currentType.val, val);
    };

    const handleSliderNumberInput = (e) => {
        localNumberText.val = e.target.value;
        const num = parseFloat(e.target.value);
        if (!isNaN(num) && num > 0) {
            currentValue.val = num;
            emitChange(currentType.val, num);
        }
    };

    const handleNumberInputChange = (e) => {
        localNumberText.val = e.target.value;
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) {
            currentValue.val = num;
            emitChange(currentType.val, num);
        }
    };

    const handleNumberIncrement = (delta) => {
        const newVal = (currentValue.val ?? 0) + delta;
        currentValue.val = newVal;
        localNumberText.val = String(newVal);
        emitChange(currentType.val, newVal);
    };

    const handleRawChange = (e) => {
        const newText = e.target.value;
        rawSource.val = newText;

        const newParsed = parseFunction(newText);
        if (newParsed.type !== FUNCTION_TYPES.COMPLEX) {
            currentType.val = newParsed.type;
            currentValue.val = newParsed.value;
            localNumberText.val = String(newParsed.value ?? '');
        }

        data[dataKey] = newText;
    };

    const handleRawBlur = () => {
        isFocused.val = false;
        const newParsed = parseFunction(rawSource.val);
        if (newParsed.type !== FUNCTION_TYPES.COMPLEX) {
            currentType.val = newParsed.type;
            currentValue.val = newParsed.value;
            localNumberText.val = String(newParsed.value ?? '');
        }
    };

    const handlePresetClick = (presetVal) => {
        currentValue.val = presetVal;
        localNumberText.val = String(presetVal);
        emitChange(currentType.val, presetVal);
    };

    const handleFocus = () => { isFocused.val = true; };
    const handleBlur = () => { isFocused.val = false; };

    const selectableTypes = [
        FUNCTION_TYPES.MULTIPLY,
        FUNCTION_TYPES.DIVIDE,
        FUNCTION_TYPES.FIXED,
        FUNCTION_TYPES.PASSTHROUGH,
        FUNCTION_TYPES.MIN,
        FUNCTION_TYPES.MAX,
        FUNCTION_TYPES.COMPLEX
    ];

    const sliderConfig = getSliderConfig(FUNCTION_TYPES.MULTIPLY);
    const presets = getPresetValues(FUNCTION_TYPES.MULTIPLY);

    const isSliderType = (type) => type === FUNCTION_TYPES.MULTIPLY || type === FUNCTION_TYPES.DIVIDE;
    const isNumberType = (type) => type === FUNCTION_TYPES.FIXED || type === FUNCTION_TYPES.MIN || type === FUNCTION_TYPES.MAX;

    return div({ class: 'function-input' },
        div({ class: 'function-input-row' },
            select({
                class: 'function-type-select',
                value: currentType,
                onchange: handleTypeChange
            },
                selectableTypes.map(type =>
                    option({
                        value: type,
                        selected: () => currentType.val === type
                    }, `${FUNCTION_TYPE_LABELS[type]} ${FUNCTION_TYPE_NAMES[type]}`)
                )
            ),

            div({
                class: 'function-slider-group',
                style: () => isSliderType(currentType.val) ? '' : 'display: none;'
            },
                input({
                    type: 'range',
                    class: 'function-slider',
                    min: sliderConfig.min,
                    max: sliderConfig.max,
                    step: sliderConfig.step,
                    value: () => Math.min(sliderConfig.max, Math.max(sliderConfig.min, currentValue.val)),
                    oninput: handleSliderChange,
                    onfocus: handleFocus,
                    onblur: handleBlur
                }),
                div({ class: 'function-value-input-wrapper' },
                    input({
                        type: 'number',
                        class: 'function-value-input',
                        value: localNumberText,
                        min: 0.1,
                        step: 0.5,
                        oninput: handleSliderNumberInput,
                        onfocus: handleFocus,
                        onblur: handleBlur
                    }),
                    span({ class: 'function-value-suffix' },
                        () => currentType.val === FUNCTION_TYPES.MULTIPLY ? '×' : '÷'
                    )
                )
            ),

            div({
                class: 'function-number-input-wrapper',
                style: () => isNumberType(currentType.val) ? '' : 'display: none;'
            },
                button({
                    class: 'function-number-btn',
                    onclick: () => handleNumberIncrement(-1),
                    tabindex: -1
                }, '−'),
                input({
                    type: 'number',
                    class: 'function-number-input',
                    value: localNumberText,
                    oninput: handleNumberInputChange,
                    onfocus: handleFocus,
                    onblur: handleBlur
                }),
                button({
                    class: 'function-number-btn',
                    onclick: () => handleNumberIncrement(1),
                    tabindex: -1
                }, '+')
            ),

            span({
                class: 'function-passthrough-label',
                style: () => currentType.val === FUNCTION_TYPES.PASSTHROUGH ? '' : 'display: none;'
            }, '(no change)'),

            input({
                type: 'text',
                class: 'function-raw-input',
                style: () => currentType.val === FUNCTION_TYPES.COMPLEX ? '' : 'display: none;',
                value: rawSource,
                oninput: handleRawChange,
                onfocus: handleFocus,
                onblur: handleRawBlur,
                spellcheck: false,
                placeholder: '(t) => t'
            })
        ),

        div({
            class: 'function-presets',
            style: () => isSliderType(currentType.val) ? '' : 'display: none;'
        },
            presets.map(preset =>
                button({
                    class: () => `function-preset-btn ${currentValue.val === preset ? 'active' : ''}`,
                    onclick: () => handlePresetClick(preset),
                    tabindex: -1
                }, () => `${preset}${currentType.val === FUNCTION_TYPES.MULTIPLY ? '×' : '÷'}`)
            )
        )
    );
};
