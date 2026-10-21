import { registerCheat } from "../core/registration.js";
import { sushiAutomation } from "./sushi/automation.js";

registerCheat({
    name: "w7 sushitools",
    category: "w7",
    needsParam: true,
    message:
        "Sushi tools: status, sort, stop, configure, knowledge <tier> <quantity>, start manual <tier>, start wind.",
    fn: (params) => JSON.stringify(sushiAutomation(params)),
});
