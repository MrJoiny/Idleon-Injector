const WebSocket = require("ws");
const { createLogger } = require("../utils/logger");

const log = createLogger("DevTools");

/**
 * Relay an embedded inspector to the current game without inspecting its own iframe.
 * Child targets and breakpoints require the external inspector. Auto-attachment can
 * crash Chromium 87; pausing the game also stalls the embedded frontend.
 * @param {WebSocket} downstream - Authorized frontend connection.
 * @param {Object} config - CDP client and port.
 * @returns {Promise<void>} Resolves once upstream connection handlers are installed.
 */
async function relayDevTools(downstream, { client, cdpPort }) {
    let upstream;
    downstream.pause();
    downstream.on("close", () => upstream?.terminate());
    downstream.on("error", (error) => {
        log.error("Frontend connection failed:", error.message);
        upstream?.terminate();
    });

    try {
        const { targetInfo } = await client.Target.getTargetInfo();
        if (downstream.readyState !== WebSocket.OPEN) return;
        upstream = new WebSocket(`ws://127.0.0.1:${cdpPort}/devtools/page/${targetInfo.targetId}`);
        upstream.on("open", () => downstream.resume());
        upstream.on("close", () => downstream.close());
        upstream.on("error", (error) => {
            log.error("Game connection failed:", error.message);
            downstream.close(1011, "Game debugger connection failed");
        });
        upstream.on("message", (data) => {
            const message = JSON.parse(data.toString());
            // Other debugger connections can still cause a pause. Resume from
            // Node, since the embedded frontend cannot run while the game pauses.
            if (message.method === "Debugger.paused") {
                upstream.send(JSON.stringify({ id: -2, method: "Debugger.resume" }));
                return;
            }
            if (message.id === -2 || message.method === "Debugger.resumed") return;
            if (downstream.readyState === WebSocket.OPEN) downstream.send(data.toString());
        });
        downstream.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.method === "Target.setAutoAttach") {
                    message.params = { ...message.params, autoAttach: false, waitForDebuggerOnStart: false };
                }
                // Keep pause events observable so the relay can resume even
                // when a different debugger session causes the pause.
                if (message.method === "Debugger.setSkipAllPauses") message.params = { skip: false };
                if (message.method === "Debugger.pause") {
                    downstream.send(
                        JSON.stringify({
                            id: message.id,
                            error: { code: -32000, message: "Use Open externally to pause the game." },
                        })
                    );
                    return;
                }
                if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify(message));
            } catch {
                downstream.close(1007, "Invalid debugger message");
            }
        });
    } catch (error) {
        log.error("Could not connect embedded inspector:", error.message);
        downstream.close(1011, "Game debugger unavailable");
    }
}

module.exports = { relayDevTools };
