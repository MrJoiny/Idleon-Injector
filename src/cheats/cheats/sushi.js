import { registerCheat } from "../core/registration.js";
import { sushiAutomation } from "./sushi/automation.js";

registerCheat({
    name: "w7 sushitools",
    category: "w7",
    needsParam: true,
    message:
        "Sushi tools: status, sort, stop, configure, knowledge <tier> <quantity>, start manual <tier>, start wind.",
    fn: ([action = "status", ...args]) => {
        let settings = {};
        if (args[0]?.startsWith("{")) {
            settings = JSON.parse(args.join(" "));
        } else {
            const names =
                action === "knowledge"
                    ? ["tier", "quantity"]
                    : ["mode", "tier", "targetCount", "targetTier", "reserveSlots", "extendChain", "higherTier"];
            if (args.length > names.length) throw new Error("Too many Sushi arguments.");
            settings = Object.fromEntries(
                args.map((value, index) => {
                    const name = names[index];
                    if (name === "mode") return [name, value];
                    if (name === "extendChain" || name === "higherTier") {
                        if (value !== "true" && value !== "false") throw new Error(`${name} must be a boolean.`);
                        return [name, value === "true"];
                    }
                    return [name, Number(value)];
                })
            );
        }
        return JSON.stringify(sushiAutomation(action, settings));
    },
});
