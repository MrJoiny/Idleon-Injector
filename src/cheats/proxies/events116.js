import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";

/** Setup storage quantity labels without scientific notation in the game's digit fonts. */
export function setupEvents116Proxies() {
    const ActorEvents116 = events(116);
    const quantityFormat = new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 0 });

    for (const [name, key] of [
        ["_event_STORAGECHEST", "_dummytext"],
        ["_event_AttacksPage", "_DummyText"],
    ]) {
        const Original = ActorEvents116.prototype[name];
        const activeActors = new WeakSet();
        ActorEvents116.prototype[name] = function (...args) {
            if (!cheatState.wide.storagecap || activeActors.has(this)) return Reflect.apply(Original, this, args);

            const descriptor = Object.getOwnPropertyDescriptor(this, key);
            let value = this[key];
            // The chest creates digit images before shortening the count, so its label must change before base runs.
            Object.defineProperty(this, key, {
                configurable: true,
                enumerable: descriptor.enumerable,
                get: () => value,
                set(next) {
                    const scientific = /^(\d+(?:\.\d+)?e\+\d+)(M?)$/i.exec(next);
                    value = scientific ? quantityFormat.format(Number(scientific[1])) + scientific[2] : next;
                },
            });
            activeActors.add(this);
            try {
                return Reflect.apply(Original, this, args);
            } finally {
                Object.defineProperty(this, key, { ...descriptor, value });
                activeActors.delete(this);
            }
        };
    }
}
