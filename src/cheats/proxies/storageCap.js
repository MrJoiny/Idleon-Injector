import { events, gga } from "../core/globals.js";

let activeScope = null;

/**
 * Run a synchronous deposit with temporary storage hooks, restoring nested scopes on exit.
 * @param {function} callback - Original game call
 * @param {object} handlers - Atom, quantity-write and optional item-grant handlers
 * @returns {*} Original game result
 */
export function withStorageCapScope(callback, handlers) {
    const previousScope = activeScope;
    const scope = {};
    const quantities = gga.ChestQuantity;
    const ActorEvents345 = events(345);
    const ActorEvents124 = events(124);
    const ActionBlock = ActorEvents345._customBlock_ActionBlock;
    const GiveItem = ActorEvents124._customBlock_GiveItem;
    activeScope = scope;
    gga.ChestQuantity = new Proxy(quantities, {
        set(target, key, value) {
            if (activeScope === scope) value = handlers.setQuantity(target, key, value);
            return Reflect.set(target, key, value);
        },
    });
    ActorEvents345._customBlock_ActionBlock = function (...args) {
        // GiveAtoms cannot run base first: awarding atoms cannot be undone by changing its return value.
        if (activeScope === scope && args[0] === "GiveAtoms" && handlers.giveAtoms(args)) return;
        return Reflect.apply(ActionBlock, this, args);
    };
    if (handlers.giveItem) {
        ActorEvents124._customBlock_GiveItem = function (...args) {
            const callBase = () => Reflect.apply(GiveItem, this, args);
            return activeScope === scope ? handlers.giveItem(args, callBase) : callBase();
        };
    }
    try {
        return callback();
    } finally {
        gga.ChestQuantity = quantities;
        ActorEvents345._customBlock_ActionBlock = ActionBlock;
        ActorEvents124._customBlock_GiveItem = GiveItem;
        activeScope = previousScope;
    }
}
