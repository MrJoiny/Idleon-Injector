/**
 * Function Parser Utility
 * 
 * Parses function strings to detect common patterns (multiply, divide, fixed, etc.)
 * and generates new function strings based on user input.
 */

/**
 * Supported function pattern types
 */
export const FUNCTION_TYPES = {
    MULTIPLY: 'multiply',    // (t) => t * n
    DIVIDE: 'divide',        // (t) => t / n
    FIXED: 'fixed',          // (t) => n
    PASSTHROUGH: 'passthrough', // (t) => t
    MIN: 'min',              // (t) => Math.min(t, n)
    MAX: 'max',          // (t) => Math.max(t, n)
    COMPLEX: 'complex'       // Anything else
};

/**
 * Display labels for each function type (simple symbols)
 */
export const FUNCTION_TYPE_LABELS = {
    [FUNCTION_TYPES.MULTIPLY]: '×',
    [FUNCTION_TYPES.DIVIDE]: '÷',
    [FUNCTION_TYPES.FIXED]: '=',
    [FUNCTION_TYPES.PASSTHROUGH]: 't',
    [FUNCTION_TYPES.MIN]: '≤',
    [FUNCTION_TYPES.MAX]: '≥',
    [FUNCTION_TYPES.COMPLEX]: 'fn'
};

/**
 * Full display names for tooltips
 */
export const FUNCTION_TYPE_NAMES = {
    [FUNCTION_TYPES.MULTIPLY]: 'Multiply',
    [FUNCTION_TYPES.DIVIDE]: 'Divide',
    [FUNCTION_TYPES.FIXED]: 'Fixed',
    [FUNCTION_TYPES.PASSTHROUGH]: 'Pass-through',
    [FUNCTION_TYPES.MIN]: 'Min',
    [FUNCTION_TYPES.MAX]: 'Max',
    [FUNCTION_TYPES.COMPLEX]: 'Custom'
};

/**
 * Regex patterns for detecting function types
 * Order matters - more specific patterns should come first
 */
const PATTERNS = [
    // Passthrough: (t) => t
    {
        type: FUNCTION_TYPES.PASSTHROUGH,
        regex: /^\s*\(?t\)?\s*=>\s*t\s*$/,
        extract: () => null
    },
    // Fixed zero: (t) => 0
    {
        type: FUNCTION_TYPES.FIXED,
        regex: /^\s*\(?t\)?\s*=>\s*(-?\d+\.?\d*)\s*$/,
        extract: (match) => parseFloat(match[1])
    },
    // Multiply: (t) => t * n
    {
        type: FUNCTION_TYPES.MULTIPLY,
        regex: /^\s*\(?t\)?\s*=>\s*t\s*\*\s*(-?\d+\.?\d*)\s*$/,
        extract: (match) => parseFloat(match[1])
    },
    // Divide: (t) => t / n
    {
        type: FUNCTION_TYPES.DIVIDE,
        regex: /^\s*\(?t\)?\s*=>\s*t\s*\/\s*(-?\d+\.?\d*)\s*$/,
        extract: (match) => parseFloat(match[1])
    },
    // Min: (t) => Math.min(t, n)
    {
        type: FUNCTION_TYPES.MIN,
        regex: /^\s*\(?t\)?\s*=>\s*Math\.min\s*\(\s*t\s*,\s*(-?\d+\.?\d*)\s*\)\s*$/,
        extract: (match) => parseFloat(match[1])
    },
    // Max: (t) => Math.max(t, n)
    {
        type: FUNCTION_TYPES.MAX,
        regex: /^\s*\(?t\)?\s*=>\s*Math\.max\s*\(\s*t\s*,\s*(-?\d+\.?\d*)\s*\)\s*$/,
        extract: (match) => parseFloat(match[1])
    }
];

/**
 * Parse a function (or function string) to detect its pattern type and value
 * 
 * @param {Function|string} fn - The function or function string to parse
 * @returns {{ type: string, value: number|null, source: string }} Parsed result
 */
export const parseFunction = (fn) => {
    // Get the source string
    const source = typeof fn === 'function' ? fn.toString() : String(fn);

    // Try each pattern
    for (const pattern of PATTERNS) {
        const match = source.match(pattern.regex);
        if (match) {
            return {
                type: pattern.type,
                value: pattern.extract(match),
                source
            };
        }
    }

    // No pattern matched - it's complex
    return {
        type: FUNCTION_TYPES.COMPLEX,
        value: null,
        source
    };
};

/**
 * Generate a function string from a type and value
 * 
 * @param {string} type - The function type (from FUNCTION_TYPES)
 * @param {number|null} value - The numeric value (if applicable)
 * @returns {string} The generated function string
 */
export const generateFunctionString = (type, value) => {
    switch (type) {
        case FUNCTION_TYPES.MULTIPLY:
            return `(t) => t * ${value}`;
        case FUNCTION_TYPES.DIVIDE:
            return `(t) => t / ${value}`;
        case FUNCTION_TYPES.FIXED:
            return `(t) => ${value}`;
        case FUNCTION_TYPES.PASSTHROUGH:
            return '(t) => t';
        case FUNCTION_TYPES.MIN:
            return `(t) => Math.min(t, ${value})`;
        case FUNCTION_TYPES.MAX:
            return `(t) => Math.max(t, ${value})`;
        default:
            return `(t) => t`;
    }
};

/**
 * Convert a function string to an actual executable function
 * 
 * @param {string} fnString - The function string
 * @returns {Function|null} The executable function, or null if invalid
 */
export const stringToFunction = (fnString) => {
    try {
        // Use Function constructor to create the function
        // This is safe since we control the input and it runs client-side only
        return new Function('return ' + fnString)();
    } catch (e) {
        console.warn('Failed to parse function string:', fnString, e);
        return null;
    }
};

/**
 * Check if a value is a function (either actual function or function string)
 * 
 * @param {any} value - The value to check
 * @returns {boolean} True if the value represents a function
 */
export const isFunction = (value) => {
    if (typeof value === 'function') return true;
    if (typeof value === 'string') {
        // Check if it looks like an arrow function
        return /^\s*\(?[\w,\s]*\)?\s*=>/.test(value);
    }
    return false;
};

/**
 * Get default slider range for a function type
 * 
 * @param {string} type - The function type
 * @returns {{ min: number, max: number, step: number }} Slider configuration
 */
export const getSliderConfig = (type) => {
    switch (type) {
        case FUNCTION_TYPES.MULTIPLY:
            return { min: 1, max: 20, step: 0.5 };
        case FUNCTION_TYPES.DIVIDE:
            return { min: 1, max: 20, step: 0.5 };
        case FUNCTION_TYPES.FIXED:
        case FUNCTION_TYPES.MIN:
        case FUNCTION_TYPES.MAX:
            // These use NumberInput, not slider
            return null;
        default:
            return null;
    }
};

/**
 * Get preset values for slider quick-select buttons
 * 
 * @param {string} type - The function type
 * @returns {number[]} Array of preset values
 */
export const getPresetValues = (type) => {
    switch (type) {
        case FUNCTION_TYPES.MULTIPLY:
            return [1, 2, 4, 5, 10, 20];
        case FUNCTION_TYPES.DIVIDE:
            return [1, 2, 4, 5, 10, 20];
        default:
            return [];
    }
};
