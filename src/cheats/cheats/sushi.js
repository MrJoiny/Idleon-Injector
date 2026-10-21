import { registerCheat } from "../core/registration.js";
import { busy, getSushiStatus, startSushi, sortSushi, stopSushi } from "./sushi/automation.js";
import { simulateSushiKnowledge } from "./sushi/knowledge.js";

const commands = {
    "": {
        fn: () => (busy ? stopSushi() : startSushi()),
        message: "Start or stop Sushi automation; settings in config",
    },
    status: { fn: getSushiStatus, message: "Read Sushi tools status" },
    sort: { fn: sortSushi, message: "Sort the Sushi board" },
    knowledge: {
        fn: (params) => {
            if (busy) throw new Error("Stop automation before adding Knowledge XP.");
            if (params.length !== 2) throw new Error("Use knowledge <tier> <quantity>.");
            return { busy: false, message: simulateSushiKnowledge(Number(params[0]), Number(params[1])) };
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
