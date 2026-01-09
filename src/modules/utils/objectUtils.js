/**
 * Object Utility Functions
 * 
 * Native JavaScript implementations for object manipulation.
 * Provides deepClone, deepMerge, and union functions.
 */

/**
 * Deep clone an object, handling functions by reference.
 * Unlike structuredClone(), this supports objects containing functions.
 * @param {any} obj - Object or value to clone
 * @returns {any} Deep cloned copy
 */
const deepClone = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object' && typeof obj !== 'function') {
    return obj;
  }

  if (typeof obj === 'function') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
};

/**
 * Union of two arrays (concatenates and deduplicates)
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {Array} New array with unique elements from both arrays
 */
const union = (arr1, arr2) => {
  const a1 = Array.isArray(arr1) ? arr1 : [];
  const a2 = Array.isArray(arr2) ? arr2 : [];
  return [...new Set([...a1, ...a2])];
};

/**
 * Deep merge two objects (mutates target in-place)
 * Behavior matches lodash merge:
 * - Replaces primitives with source values
 * - Replaces arrays completely (does NOT concatenate)
 * - Deeply merges nested objects
 * - Preserves functions
 * @param {Object} target - Target object to merge into
 * @param {Object} source - Source object to merge from
 * @returns {Object} The merged target object
 */
const deepMerge = (target, source) => {
  if (source === null || source === undefined) {
    return target;
  }

  if (typeof source !== 'object') {
    return source;
  }

  if (Array.isArray(source)) {
    return source;
  }

  if (target === null || target === undefined || typeof target !== 'object' || Array.isArray(target)) {
    return source;
  }

  const result = target;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = deepMerge(result[key], source[key]);
    }
  }

  return result;
};

module.exports = {
  deepClone,
  union,
  deepMerge
};
