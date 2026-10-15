import { events, gga } from "../core/globals.js";

let activeScope = null;

/**
 * Run a synchronous deposit with temporary storage hooks, restoring nested scopes on exit.
 * @param {function} callback - Original game call
 * @param {object} handlers - Atom, quantity-write and optional item-grant handlers
 * @returns {*} Original game result
 */
export function withStorageCapScope(callback, handlers) {
    const quantities = gga.ChestQuantity;
    const ActorEvents345 = events(345);
    const ActionBlock = ActorEvents345._customBlock_ActionBlock;

    const previousScope = activeScope;
    const scope = {};
    let ActorEvents124 = null;
    let GiveItem = null;

    activeScope = scope;
    try {
        gga.ChestQuantity = new Proxy(quantities, {
            set(target, key, value) {
                if (activeScope === scope) {
                    value = handlers.setQuantity(target, key, value);
                }
                return Reflect.set(target, key, value);
            },
        });
        ActorEvents345._customBlock_ActionBlock = function (...args) {
            // GiveAtoms cannot run base first: awarding atoms cannot be undone by changing its return value.
            if (activeScope === scope && args[0] === "GiveAtoms" && handlers.giveAtoms(args)) return;
            return Reflect.apply(ActionBlock, this, args);
        };
        if (handlers.giveItem) {
            ActorEvents124 = events(124);
            GiveItem = ActorEvents124._customBlock_GiveItem;
            ActorEvents124._customBlock_GiveItem = function (...args) {
                const callBase = () => Reflect.apply(GiveItem, this, args);
                return activeScope === scope ? handlers.giveItem(args, callBase) : callBase();
            };
        }
        return callback();
    } finally {
        gga.ChestQuantity = quantities;
        ActorEvents345._customBlock_ActionBlock = ActionBlock;
        if (ActorEvents124) {
            ActorEvents124._customBlock_GiveItem = GiveItem;
        }
        activeScope = previousScope;
    }
}
