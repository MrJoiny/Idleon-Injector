import van from "../../vendor/van-1.6.0.js";
import * as API from "../../services/api.js";
import { IS_ELECTRON } from "../../state/constants.js";

const { div, iframe, button } = van.tags;

export const DevTools = () => {
    const url = van.state("");
    const error = van.state("");
    const isEmbedded = window.parent !== window;
    const webUiUrl = `http://localhost:${window.location.port || "8080"}`;

    // Load DevTools URL on mount (skip if embedded to prevent crashes)
    if (!isEmbedded) {
        API.fetchDevToolsUrl()
            .then((devtoolsUrl) => {
                url.val = devtoolsUrl;
            })
            .catch((e) => {
                error.val = e.message;
            });
    }

    const openDevTools = async () => {
        try {
            const devtoolsUrl = await API.fetchDevToolsUrl();
            if (IS_ELECTRON) {
                await API.openExternalUrl(devtoolsUrl);
            } else {
                window.open(devtoolsUrl, "_blank", "noopener,noreferrer");
            }
        } catch (e) {
            error.val = `Failed to open ChromeDebug: ${e.message}`;
        }
    };

    const openWebUi = async () => {
        try {
            if (IS_ELECTRON) {
                await API.openExternalUrl(webUiUrl);
            } else {
                window.open(webUiUrl, "_blank", "noopener,noreferrer");
            }
        } catch (e) {
            error.val = `Failed to open Web UI: ${e.message}`;
        }
    };

    const renderEmbeddedView = () =>
        div(
            { class: "devtools-popout-card", role: "status" },
            div({ class: "devtools-popout-kicker" }, "EMBEDDED GAME VIEW"),
            div({ class: "devtools-popout-title" }, "ChromeDebug opens separately"),

            div("Embedded DevTools is disabled inside the game UI to prevent crashes"),
            div("Use the pop-out window for full DevTools access"),
            div(
                { class: "devtools-actions" },
                button(
                    {
                        type: "button",
                        class: "btn-primary",
                        onclick: openWebUi,
                    },
                    "Open Web UI"
                ),
                button(
                    {
                        type: "button",
                        class: "btn-primary",
                        onclick: openDevTools,
                    },
                    "Open ChromeDebug"
                )
            ),

            () => (error.val ? div({ class: "devtools-error", role: "alert" }, error.val) : null)
        );

    const renderContent = () => {
        if (isEmbedded) {
            return renderEmbeddedView();
        }

        if (error.val) {
            return div(
                { id: "devtools-message", class: "is-error", role: "alert" },

                `Failed to load DevTools: ${error.val}`
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
        div({ class: "terminal-wrapper" }, renderContent)
    );
};
