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
        result[key] = value.toString(); // Convert function to string
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = prepareConfigForJson(value); // Recurse for nested objects
      } else {
        // Keep other JSON-serializable types as is (string, number, boolean, array, null)
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
        // Check if it looks like an arrow function string
        // Handles: (t) => ..., (t, args) => ..., t => ...
        if (/^(\(.*\)|[\w$]+)\s*=>/.test(trimmedValue)) {
          try {
            // Arrow functions are already valid expressions, wrap in parentheses for safety
            value = new Function(`return (${trimmedValue})`)();
          } catch (e) {
            console.warn(`[Config Parse] Failed to convert arrow function string for key '${key}': ${e.message}. Keeping as string.`);
          }
        }
        // If it doesn't match the arrow function pattern, it's just a regular string
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        value = parseConfigFromJson(value); // Recurse for nested objects
      }
      result[key] = value;
    }
  }
  return result;
};

module.exports = {
  objToString,
  prepareConfigForJson,
  parseConfigFromJson
};