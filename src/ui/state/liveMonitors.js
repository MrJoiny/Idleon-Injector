import van from "../vendor/van-1.6.0.js";
import { onMonitorUpdate, onConnectionChange, sendMonitorSubscribe, sendMonitorUnsubscribe } from "../services/ws.js";
import { monitorIdFromMonitorPath, resolveMonitorEntry } from "../utils/search/valueUtils.js";

const values = van.state({});
const desired = new Map();
let acknowledged = new Set();

onMonitorUpdate((data) => {
    const next = data || {};
    for (const [id, path] of desired) {
        if (acknowledged.has(id) && !next[id]) sendMonitorSubscribe(id, path);
    }
    acknowledged = new Set(Object.keys(next));
    values.val = next;
});

onConnectionChange((connected) => {
    if (!connected) return;
    acknowledged.clear();
    for (const [id, path] of desired) sendMonitorSubscribe(id, path);
});

/**
 * Replace subscription intent with the enabled saved paths supplied by Search.
 * Pending and failed subscriptions stay registered until explicitly removed;
 * server state updates must not create repeated subscribe requests.
 * @param {Iterable<string>} paths - Game paths including the gga. prefix.
 * @returns {void}
 */
const sync = (paths) => {
    const next = new Map([...paths].map((path) => [monitorIdFromMonitorPath(path), path]));
    for (const id of desired.keys()) {
        if (next.has(id)) continue;
        desired.delete(id);
        acknowledged.delete(id);
        sendMonitorUnsubscribe(id);
    }
    for (const [id, path] of next) {
        if (desired.has(id)) continue;
        desired.set(id, path);
        sendMonitorSubscribe(id, path);
    }
};

/**
 * Read the current value history and error for a game path reactively.
 * @param {string} path - Game path including the gga. prefix.
 * @returns {{id:string, entry:object|null}} Current server entry.
 */
const resolve = (path) => resolveMonitorEntry(path, values.val);

export default { values, sync, resolve };
