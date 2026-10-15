import { events } from "../core/globals.js";

const hookedClasses = new WeakSet();

const quantityFormat = new Intl.NumberFormat("en-US", { useGrouping: false, maximumFractionDigits: 0 });
const formatCount = (val) => {
    if (typeof val !== "string") return val;
    const match = /^(\d+(?:\.\d+)?e\+?\d+)([A-Za-z]*)$/i.exec(val);
    return match ? quantityFormat.format(Number(match[1])) + match[2] : val;
};

export function setupEvents116Proxies(ActorEvents116 = events(116)) {
    if (hookedClasses.has(ActorEvents116)) return;

    const activeActors = new WeakSet();

    for (const name of ["init", "_event_STORAGECHEST", "_event_AttacksPage"]) {
        const Original = ActorEvents116.prototype[name];
        ActorEvents116.prototype[name] = function (...args) {
            if (activeActors.has(this)) {
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

    hookedClasses.add(ActorEvents116);
}
