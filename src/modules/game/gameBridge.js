const { objToString } = require("../utils/helpers");

/** Own argument encoding, context binding, and CDP result decoding for game helpers. */
function createGameBridge(runtime, context) {
    const evaluate = async (expression, options) => {
        const response = await runtime.evaluate({ expression, ...options });
        const exception = response?.exceptionDetails;
        if (!exception && (!response?.result || typeof response.result !== "object")) {
            throw new Error("Game evaluation returned no result");
        }
        return {
            value: response?.result?.value,
            error: exception
                ? { text: exception.text, details: exception.exception?.description ?? exception.text }
                : null,
        };
    };

    return {
        callHelper(name, args = [], bindContext = false) {
            if (!/^(?:window\.)?[A-Za-z_$][\w$]*$/.test(name)) throw new Error("Invalid game helper name");
            if (!Array.isArray(args)) throw new Error("Game helper arguments must be an array");
            const encoded = args.map((value) => JSON.stringify(value) ?? "undefined").join(", ");
            const expression = bindContext
                ? `${name}.call(${context}${encoded ? `, ${encoded}` : ""})`
                : `${name}(${encoded})`;
            const options = { awaitPromise: true, returnByValue: true };
            if (name === "writeGamePath" || name === "writeGamePaths" || name === "deleteGamePath") {
                options.allowUnsafeEvalBlockedByCSP = true;
            }
            return evaluate(expression, options);
        },

        executeCheat(action) {
            return evaluate(`cheat.call(${context}, ${JSON.stringify(String(action))})`, {
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });
        },

        async isAttached() {
            const result = await evaluate(`!!(${context})`);
            return !!result.value;
        },

        updateConfig(config) {
            return evaluate(
                `if (typeof updateCheatConfig === 'function') {
                    updateCheatConfig(${objToString(config)});
                    'Config updated in game.';
                } else {
                    'Error: updateCheatConfig function not found in game context.';
                }`,
                { awaitPromise: true, allowUnsafeEvalBlockedByCSP: true }
            );
        },
    };
}

module.exports = { createGameBridge };
