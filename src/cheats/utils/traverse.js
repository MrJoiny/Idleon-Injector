/**
 * Traverse Utilities
 *
 * Two distinct traversal patterns:
 * - traverse: Visit nodes at specific depth (for cList proxies), unwraps .h
 * - traverseAll: Visit every node with path tracking (for diagnostics), raw paths
 */

/**
 * Formats an array of path segments into a valid JS property access string.
 * Numeric segments become bracket notation, identifiers use dot notation.
 * @param {string[]} segments - Array of path keys
 * @returns {string} Formatted path (e.g., "foo.bar[0].baz")
 */
export function buildPath(segments) {
    return segments.reduce((path, seg, i) => {
        if (i === 0) return seg;
        return /^\d+$/.test(seg) ? `${path}[${seg}]` : `${path}.${seg}`;
    }, "");
}

/**
 * Visit nodes at a specific depth (for cList proxies).
 * Unwraps .h properties automatically (Haxe object convention).
 *
 * @param {object} obj - The object to traverse
 * @param {number} depth - Depth at which to call worker (0 = immediate children)
 * @param {function(any): void} worker - Function called with each node at target depth
 */
export function traverse(obj, depth, worker) {
    if (obj === null || obj === undefined || typeof obj !== "object") return;

    const visited = new Set();

    function walk(node, d) {
        if (node === null || node === undefined || typeof node !== "object" || visited.has(node)) return;
        visited.add(node);

        const target = node.h || node;
        if (d === depth) {
            worker(node);
            return;
        }
        for (const v of Object.values(target)) walk(v, d + 1);
    }

    walk(obj, 0);
}

/**
 * Visit every node with path tracking (for diagnostics).
 * Does NOT unwrap .h - shows true object paths.
 *
 * @param {object} obj - The object to traverse
 * @param {function(any, string[]): void} worker - Function called with (value, path)
 * @param {Set} [visited] - Optional: shared visited set for scanning multiple roots
 */
export function traverseAll(obj, worker, visited = new Set()) {
    const path = [];

    function walk(node) {
        if (node === null || node === undefined) {
            worker(node, path);
            return;
        }
        worker(node, path);
        if (typeof node !== "object" || visited.has(node)) return;
        visited.add(node);

        for (const key of Object.keys(node)) {
            const descriptor = Object.getOwnPropertyDescriptor(node, key);
            if (!descriptor) continue;

            let value;
            if ("value" in descriptor) {
                value = descriptor.value;
            } else if (descriptor.get) {
                // Handle accessor properties (getters) created by ValueMonitor.wrap()
                try {
                    value = descriptor.get.call(node);
                } catch {
                    continue; // Skip if getter throws
                }
            } else {
                continue;
            }

            path.push(key);
            walk(value);
            path.pop();
        }
    }

    walk(obj);
}
