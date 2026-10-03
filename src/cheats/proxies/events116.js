/**
 * Install storage digit-font protection before actors initialize and bind their listeners.
 * @param {Function} ActorEvents116 - The game's storage actor class.
 * @returns {void}
 */
export function setupEvents116Proxies(ActorEvents116) {
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
