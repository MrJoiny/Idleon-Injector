/**
 * Utility functions for the Idleon Cheat Injector
 * 
 * This module provides helper functions for object serialization and configuration
 * management, particularly for converting JavaScript objects with functions to/from
 * string representations for injection and API communication.
 */

/**
 * Converts a JavaScript object (potentially with functions) into a string representation
 * suitable for injection into the target environment. Functions are converted to their string form.
 * @param {Object} obj - The object to convert to string
 * @returns {string} String representation of the object
 */
const objToString = (obj) => {
  let ret = "{";

  for (let k in obj) {
    let v = obj[k];

    if (typeof v === "function") {
      v = v.toString();
    } else if (typeof v === 'boolean') {
      v = v;
    } else if (typeof v === 'number') {
      v = v;
    } else if (Array.isArray(v)) {
      v = JSON.stringify(v);
    } else if (typeof v === "object") {
      v = objToString(v);
    } else {
      v = `"${v}"`;
    }

    ret += `\n  ${k}: ${v},`;
  }

  ret += "\n}";

  return ret;
};

/**
 * Helper function to prepare config for JSON serialization, converting functions to strings
 * @param {Object} obj - The configuration object to prepare
 * @returns {Object} Object with functions converted to strings
 */
const prepareConfigForJson = (obj) => {
  const result = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'function') {
        result[key] = value.toString();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = prepareConfigForJson(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

/**
 * Helper function to parse config from JSON, converting function strings back to functions
 * @param {Object} obj - The configuration object to parse
 * @returns {Object} Object with function strings converted back to functions
 */
const parseConfigFromJson = (obj) => {
  const result = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      let value = obj[key];
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        // Check if it looks like an arrow function string: (t) => ..., (t, args) => ..., t => ...
        if (/^(\(.*\)|[\w$]+)\s*=>/.test(trimmedValue)) {
          try {
            value = new Function(`return (${trimmedValue})`)();
          } catch (e) {
            console.warn(`[Config Parse] Failed to convert arrow function string for key '${key}': ${e.message}. Keeping as string.`);
          }
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        value = parseConfigFromJson(value);
      }
      result[key] = value;
    }
  }
  return result;
};

/**
 * Recursively filters an object to only include keys that exist in the template object.
 * @param {Object} target - The object to filter
 * @param {Object} template - The template object acting as the schema
 * @returns {Object} A new object with only the keys that exist in the template
 */
const filterByTemplate = (target, template) => {
  if (target === null || target === undefined || template === null || template === undefined) {
    return undefined;
  }

  if (typeof target !== 'object' || Array.isArray(target) || typeof template !== 'object' || Array.isArray(template)) {
    return target;
  }

  const filtered = {};
  for (const key in target) {
    if (Object.hasOwnProperty.call(target, key) && Object.hasOwnProperty.call(template, key)) {
      const targetVal = target[key];
      const templateVal = template[key];

      if (typeof targetVal === 'object' && targetVal !== null && !Array.isArray(targetVal)) {
        const nestedFiltered = filterByTemplate(targetVal, templateVal);
        if (nestedFiltered !== undefined) {
          filtered[key] = nestedFiltered;
        }
      } else {
        filtered[key] = targetVal;
      }
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : undefined;
};

/**
 * Recursively compares two objects and returns only the properties from `current`
 * that differ from `defaultObj`. Used to save only user overrides to config.custom.js.
 * @param {Object} current - The current full configuration object
 * @param {Object} defaultObj - The default configuration object to compare against
 * @returns {Object} An object containing only the properties that differ from defaults
 */
const getDeepDiff = (current, defaultObj) => {
  if (current === null || current === undefined) {
    return current;
  }
  if (defaultObj === null || defaultObj === undefined) {
    return current;
  }
  if (typeof current !== 'object' || Array.isArray(current)) {
    if (JSON.stringify(current) !== JSON.stringify(defaultObj)) {
      return current;
    }
    return undefined;
  }

  // Helper to normalize values for comparison (handles function strings vs actual functions)
  const normalizeForComparison = (val) => {
    if (typeof val === 'function') {
      return val.toString();
    }
    if (typeof val === 'string' && /^(\(.*\)|[\w$]+)\s*=>/.test(val.trim())) {
      // It's already a stringified arrow function
      return val.trim();
    }
    return val;
  };

  const diff = {};
  for (const key in current) {
    if (Object.hasOwnProperty.call(current, key)) {
      const currentVal = current[key];
      const defaultVal = defaultObj ? defaultObj[key] : undefined;

      if (typeof currentVal === 'object' && currentVal !== null && !Array.isArray(currentVal)) {
        const nestedDiff = getDeepDiff(currentVal, defaultVal);
        if (nestedDiff !== undefined && Object.keys(nestedDiff).length > 0) {
          diff[key] = nestedDiff;
        }
      } else {
        const normalizedCurrent = normalizeForComparison(currentVal);
        const normalizedDefault = normalizeForComparison(defaultVal);

        const currentStr = typeof normalizedCurrent === 'string' && /^(\(.*\)|[\w$]+)\s*=>/.test(normalizedCurrent)
          ? normalizedCurrent
          : JSON.stringify(normalizedCurrent);
        const defaultStr = typeof normalizedDefault === 'string' && /^(\(.*\)|[\w$]+)\s*=>/.test(normalizedDefault)
          ? normalizedDefault
          : JSON.stringify(normalizedDefault);

        if (currentStr !== defaultStr) {
          diff[key] = currentVal;
        }
      }
    }
  }

  return Object.keys(diff).length > 0 ? diff : undefined;
};

module.exports = {
  objToString,
  prepareConfigForJson,
  parseConfigFromJson,
  filterByTemplate,
  getDeepDiff
};