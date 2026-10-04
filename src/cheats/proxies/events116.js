/**
 * Capture the storage actor class and protect its renderer before behavior creation.
 * The first behavior lookup follows prototype assignment and precedes listener binding.
 * @returns {void}
 */
export function setupEvents116EarlyHook() {
    Object.defineProperty(window, "__idleon_cheats__", {
        configurable: true,
        enumerable: true,
        set(registry) {
            Object.defineProperty(window, "__idleon_cheats__", {
                value: registry,
                writable: true,
                configurable: true,
                enumerable: true,
            });
            Object.defineProperty(registry, "scripts.ActorEvents_116", {
                configurable: true,
                enumerable: true,
                set(ActorEvents116) {
                    Object.defineProperty(registry, "scripts.ActorEvents_116", {
                        configurable: true,
                        enumerable: true,
                        get() {
                            Object.defineProperty(registry, "scripts.ActorEvents_116", {
                                value: ActorEvents116,
                                writable: true,
                                configurable: true,
                                enumerable: true,
                            });
                            setupEvents116Proxies(ActorEvents116);
                            return ActorEvents116;
                        },
                    });
                },
            });
        },
    });
}

function setupEvents116Proxies(ActorEvents116) {
    const quantityFormat = new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 0 });
    const activeActors = new WeakSet();

    for (const name of ["init", "_event_STORAGECHEST", "_event_AttacksPage"]) {
        const Original = ActorEvents116.prototype[name];
        ActorEvents116.prototype[name] = function (...args) {
            if (activeActors.has(this)) return Reflect.apply(Original, this, args);

            // Init creates digit images before binding listeners or shortening the count.
            const fields = ["_dummytext", "_DummyText"].map((key) => {
                const descriptor = Object.getOwnPropertyDescriptor(this, key);
                let value = this[key];
                Object.defineProperty(this, key, {
                    configurable: true,
                    enumerable: descriptor.enumerable,
                    get: () => value,
                    set(next) {
                        const scientific = /^(\d+(?:\.\d+)?e\+\d+)(M?)$/i.exec(next);
                        value = scientific ? quantityFormat.format(Number(scientific[1])) + scientific[2] : next;
                    },
                });
                return () => Object.defineProperty(this, key, { ...descriptor, value });
            });
            activeActors.add(this);
            try {
                return Reflect.apply(Original, this, args);
            } finally {
                fields.forEach((restore) => restore());
                activeActors.delete(this);
            }
        };
    }
}
