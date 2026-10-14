import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";

const hookedClasses = new WeakSet();

function hookRegistry(registry) {
    if (!registry || typeof registry !== "object") return;
    const tryHook = (cls) => {
        if (cls?.prototype?.init) {
            setupEvents116Proxies(cls);
            if (hookedClasses.has(cls)) {
                Object.defineProperty(registry, "scripts.ActorEvents_116", {
                    value: cls,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                });
            }
        }
    };
    let classRef = registry["scripts.ActorEvents_116"];
    if (classRef?.prototype?.init) {
        setupEvents116Proxies(classRef);
        return;
    }
    Object.defineProperty(registry, "scripts.ActorEvents_116", {
        configurable: true,
        enumerable: true,
        get() {
            if (classRef) tryHook(classRef);
            return classRef;
        },
        set(ActorEvents116) {
            classRef = ActorEvents116;
            tryHook(ActorEvents116);
        },
    });
}

/**
 * Capture the storage actor class and protect its renderer before behavior creation.
 * The first behavior lookup follows prototype assignment and precedes listener binding.
 * @returns {void}
 */
export function setupEvents116EarlyHook() {
    if (typeof window === "undefined") return;
    let currentRegistry = window.__idleon_cheats__;
    if (currentRegistry) {
        hookRegistry(currentRegistry);
    }
    Object.defineProperty(window, "__idleon_cheats__", {
        configurable: true,
        enumerable: true,
        get: () => currentRegistry,
        set(registry) {
            currentRegistry = registry;
            Object.defineProperty(window, "__idleon_cheats__", {
                value: registry,
                writable: true,
                configurable: true,
                enumerable: true,
            });
            hookRegistry(registry);
        },
    });
}

const quantityFormat = new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 0 });
const formatCount = (val) => {
    if (typeof val !== "string") return val;
    const match = /^(\d+(?:\.\d+)?e\+?\d+)([A-Za-z]*)$/i.exec(val);
    return match ? quantityFormat.format(Number(match[1])) + match[2] : val;
};

export function setupEvents116Proxies(ActorEvents116 = events?.(116)) {
    if (!ActorEvents116 || hookedClasses.has(ActorEvents116)) return;

    const activeActors = new WeakSet();
    let hookedAny = false;

    for (const name of ["init", "_event_STORAGECHEST", "_event_AttacksPage"]) {
        const Original = ActorEvents116.prototype?.[name];
        if (typeof Original !== "function") continue;
        hookedAny = true;
        ActorEvents116.prototype[name] = function (...args) {
            if (!cheatState.wide?.storagecap || activeActors.has(this)) {
                return Reflect.apply(Original, this, args);
            }

            // Init creates digit images before binding listeners or shortening the count.
            const fields = ["_dummytext", "_DummyText"].map((key) => {
                const descriptor = Object.getOwnPropertyDescriptor(this, key);
                let value = formatCount(this[key]);
                Object.defineProperty(this, key, {
                    configurable: true,
                    enumerable: descriptor ? descriptor.enumerable : true,
                    get: () => value,
                    set(next) {
                        value = formatCount(next);
                    },
                });
                return () => {
                    if (descriptor) {
                        if (descriptor.get || descriptor.set) {
                            Object.defineProperty(this, key, descriptor);
                            if (descriptor.set) descriptor.set.call(this, value);
                        } else {
                            Object.defineProperty(this, key, { ...descriptor, value });
                        }
                    } else {
                        delete this[key];
                        if (value !== undefined) {
                            this[key] = value;
                        }
                    }
                };
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

    if (hookedAny) {
        hookedClasses.add(ActorEvents116);
    }
}
