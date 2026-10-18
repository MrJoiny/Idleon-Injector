import { gga, events } from "../core/globals.js";

let installed = false;
let extended = false;
let higher = false;

export function configureSushiWind(extendChain, higherTier) {
    if (!installed && (extendChain || higherTier)) {
        const prototype = events(741).prototype;
        const original = prototype._customEvent_sushistuff;
        prototype._customEvent_sushistuff = function (...args) {
            const trigger = this._TRIGGEREDtext;
            const eligible = typeof trigger === "string" && /^i\d+$/.test(trigger) && this._GenINFO[158] === 0;
            const queue = this._GenINFO[157];
            const before = eligible ? queue.length : 0;
            const result = Reflect.apply(original, this, args);
            if (!eligible || (!extended && !higher)) return result;
            const rules = events(579);
            if (rules._customBlock_SushiStuff("UpgradeQTY", 29, 0) < 1) return result;
            const board = gga.Sushi[0];
            const plates = gga.Sushi[1];
            const destination = Number(trigger.slice(1));
            const maxTier = Number(rules._customBlock_SushiStuff("MaxTier", 0, 0));
            const ceiling = higher ? maxTier + 1 : Number(rules._customBlock_SushiStuff("UniqueSushi", 0, 0)) - 5;
            if (board[destination] < 0 || board[destination] > maxTier || board[destination] >= ceiling) return result;
            const limit = extended ? plates.filter((plate) => plate >= 0).length - 1 : 25;
            const chain = [];
            for (let step = 1; step <= limit && destination + step < board.length; step++) {
                const index = destination + step;
                if (
                    plates[index] < 0 ||
                    board[index] < 0 ||
                    board[index] >= maxTier ||
                    board[index] >= board[index - 1]
                )
                    break;
                chain.push(index);
            }
            // Replace only the chain just created by this event. Native processing
            // still performs each upgrade, grants XP and updates the visuals.
            if (queue.length === before + 1) queue[before] = chain;
            else if (queue.length === before && chain.length) queue.push(chain);
            return result;
        };
        installed = true;
    }
    extended = extendChain;
    higher = higherTier;
}
