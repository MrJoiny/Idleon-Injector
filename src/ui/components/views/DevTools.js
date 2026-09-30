import van from "../../vendor/van-1.6.0.js";
import * as API from "../../services/api.js";
import { IS_ELECTRON } from "../../state/constants.js";

const { div, iframe, button } = van.tags;

export const DevTools = () => {
    const url = van.state("");
    const error = van.state("");
    const openedExternally = van.state(false);
    const isEmbedded = window.parent !== window;
    API.fetchDevToolsUrl()
        .then((devtoolsUrl) => {
            const frameUrl = new URL(devtoolsUrl);
            if (isEmbedded) frameUrl.searchParams.set("ws", `${window.location.host}/devtools`);
            url.val = frameUrl.href;
        })
        .catch((e) => {
            error.val = e.message;
        });

    const openDevTools = async () => {
        try {
            const devtoolsUrl = await API.fetchDevToolsUrl();
            openedExternally.val = true;
            // Let VanJS remove the iframe and close its pause-suppressing session.
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (IS_ELECTRON) {
                await API.openExternalUrl(devtoolsUrl);
            } else {
                window.open(devtoolsUrl, "_blank", "noopener,noreferrer");
            }
        } catch (e) {
            error.val = `Failed to open ChromeDebug: ${e.message}`;
        }
    };

    const renderContent = () => {
        if (error.val) {
            return div(
                { id: "devtools-message", class: "is-error", role: "alert" },

                `Failed to load DevTools: ${error.val}`
            );
        }

        if (openedExternally.val) {
            return div(
                { id: "devtools-message", role: "status" },
                "Embedded inspector disconnected for external debugging.",
                button(
                    { type: "button", class: "btn-primary", onclick: () => (openedExternally.val = false) },
                    "Reconnect here"
                )
            );
        }

        if (!url.val) {
            return div({ id: "devtools-message", role: "status", "aria-live": "polite" }, "Connecting to ChromeDebug");
        }

        return iframe({
            id: "devtools-iframe",
            src: url.val,
            title: "Chrome DevTools",
        });
    };

    return div(
        { id: "devtools-tab", class: "tab-pane devtools-workspace" },
        isEmbedded
            ? div(
                  { class: "devtools-embedded-toolbar" },
                  div("Inspecting the main game. Use the external window for breakpoints, child frames and workers."),
                  button({ type: "button", class: "btn-primary", onclick: openDevTools }, "Open externally")
              )
            : null,
        div({ class: "terminal-wrapper" }, renderContent)
    );
};
