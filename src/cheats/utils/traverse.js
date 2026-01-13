/**
 * Traverse Utility
 *
 * Recursively traverses an object, applying a worker function at specified depths.
 * Handles circular references via a visited Set.
 *
 * @param {object} obj - The object to traverse.
 * @param {number} depth - If >= 0, only calls worker at this exact depth. If < 0, calls worker at every node.
 * @param {function(any, string[], number): void} worker - Function called with (value, path, currentDepth)
 * @param {Set} [visited] - Internal: tracked objects for circular references.
 * @param {string[]} [path] - Internal: tracked path segments.
 * @param {number} [currentDepth] - Internal: current recursion depth.
 *
 * @example
 * // Call worker at depth 2 only
 * traverse(myObject, 2, (value, path, depth) => {
 *     console.log(path.join('.'), value);
 * });
 *
 * @example
 * // Call worker at every node
 * traverse(myObject, -1, (value, path, depth) => {
 *     if (typeof value === 'number' && isNaN(value)) {
 *         console.log('NaN found at', path.join('.'));
 *     }
 * });
 */
export function traverse(obj, depth, worker, visited = new Set(), path = [], currentDepth = 0) {
    if (obj === null || obj === undefined) return;

    const isObject = typeof obj === "object";
    const shouldCallWorker = depth < 0 || currentDepth === depth;

    if (shouldCallWorker) {
        worker(obj, path, currentDepth);
    }

    // If we reached target depth and it's positive, don't go deeper
    if (depth >= 0 && currentDepth >= depth) return;

    if (!isObject || visited.has(obj)) return;

    visited.add(obj);
    const target = obj.h || obj;
    for (const key in target) {
        try {
            path.push(key);
            traverse(target[key], depth, worker, visited, path, currentDepth + 1);
            path.pop();
        } catch (e) {
            path.pop();
        }
    }
}
