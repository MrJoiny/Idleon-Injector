/**
 * Evaluate an explicit game expression and unwrap the CDP response. Game
 * exceptions are returned separately so routes retain their operation-specific
 * responses; transport failures and malformed CDP envelopes throw.
 * @param {object} runtime - CDP Runtime client, or a fake with evaluate().
 * @param {object} options - Expression and optional CDP evaluation flags.
 * @returns {Promise<{value?: any, error?: string}>} Value or game exception.
 */
async function evaluateGame(runtime, options) {
    const response = await runtime.evaluate({ awaitPromise: true, returnByValue: true, ...options });
    if (response?.exceptionDetails) {
        const exception = response.exceptionDetails;
        return { error: exception.exception?.description || exception.text || "Game evaluation failed" };
    }
    const result = response?.result;
    if (!result || (!Object.prototype.hasOwnProperty.call(result, "value") && result.type !== "undefined")) {
        throw new Error("Game evaluation returned a malformed CDP response");
    }
    return { value: result.value };
}

module.exports = { evaluateGame };
