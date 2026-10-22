import { registerCheat } from "../core/registration.js";
import { busy, enabled, getSushiStatus, startSushi, sortSushi, stopSushi } from "./sushi/automation.js";
import { simulateSushiKnowledge } from "./sushi/knowledge.js";

const commands = {
    "": {
        fn: () => (enabled ? stopSushi() : startSushi()),
        message: "Enable or disable Sushi automation; settings in config",
    },
    status: { fn: getSushiStatus, message: "Read Sushi tools status" },
    sort: { fn: sortSushi, message: "Sort the Sushi board" },
    knowledge: {
        fn: (params) => {
            if (enabled || busy) throw new Error("Disable Auto Play before adding Knowledge XP.");
            if (params.length !== 2) throw new Error("Use knowledge <tier> <quantity>.");
            return { enabled, message: simulateSushiKnowledge(Number(params[0]), Number(params[1])) };
        },
        needsParam: true,
        message: "Add crafting-tree Knowledge XP: <tier> <quantity>",
    },
};

for (const [action, { fn, message, needsParam = false }] of Object.entries(commands)) {
    registerCheat({
        name: action ? "w7 sushitools " + action : "w7 sushitools",
        category: "w7",
        needsParam,
        message,
        fn: (params) => {
            if (!needsParam && params.length)
                throw new Error(`${action || "w7 sushitools"} does not accept arguments.`);
            return JSON.stringify(fn(params));
        },
    });
}
