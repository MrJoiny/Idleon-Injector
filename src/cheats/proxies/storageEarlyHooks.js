import { setupEvents116Proxies } from "./events116.js";
import { setupEvents203Proxies } from "./events203.js";
import { setupEvents481StorageTimerProxy } from "./events481.js";

function hookRegistry(registry) {
    for (const number of [116, 203, 481]) {
        const key = `scripts.ActorEvents_${number}`;
        let classRef = registry[key];
        const tryHook = () => {
            // Haxe registers each constructor before assigning its prototype.
            if (!classRef || typeof classRef.prototype.init !== "function") return;
            if (number === 116) {
                setupEvents116Proxies(classRef);
            } else if (number === 203) {
                setupEvents203Proxies(classRef);
            } else {
                setupEvents481StorageTimerProxy(classRef, registry["com.stencyl.behavior.Script"]);
            }
            Object.defineProperty(registry, key, {
                value: classRef,
                writable: true,
                configurable: true,
                enumerable: true,
            });
        };
        Object.defineProperty(registry, key, {
            configurable: true,
            enumerable: true,
            get() {
                tryHook();
                return classRef;
            },
            set(cls) {
                classRef = cls;
                tryHook();
            },
        });
        tryHook();
    }
}

/** Install storage hooks before the first behavior lookup and actor initialization. */
export function setupStorageEarlyHooks() {
    let currentRegistry = window.__idleon_cheats__;
    if (currentRegistry) hookRegistry(currentRegistry);
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
