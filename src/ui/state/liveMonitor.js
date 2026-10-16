/** Own frontend Monitor subscriptions; paths are raw Search result paths. */
export function createLiveMonitor({ getRawMonitors, subscribe: sendSubscribe, unsubscribe: sendUnsubscribe }) {
    const subscribedPaths = new Set();
    const idForPath = (path) => "mon:" + encodeURIComponent("gga." + path);

    const subscribe = (path) => {
        sendSubscribe(idForPath(path), "gga." + path);
        subscribedPaths.add(path);
    };

    const unsubscribe = (path) => {
        sendUnsubscribe(idForPath(path));
        subscribedPaths.delete(path);
    };

    return {
        subscribe,
        unsubscribe,
        get: (path) => getRawMonitors()[idForPath(path)] || null,
        reconcile(paths) {
            const desiredPaths = new Set(paths);
            const rawMonitors = getRawMonitors();

            for (const path of desiredPaths) {
                // Preserve Search's retry when a previously requested runtime entry disappears.
                if (subscribedPaths.has(path) && !rawMonitors[idForPath(path)]) subscribedPaths.delete(path);
                if (!subscribedPaths.has(path)) subscribe(path);
            }

            for (const path of [...subscribedPaths]) {
                if (!desiredPaths.has(path)) unsubscribe(path);
            }
        },
    };
}
