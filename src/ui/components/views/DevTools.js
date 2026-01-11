import van from "../../van-1.6.0.js";
import * as API from "../../api.js";

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
            await API.openExternalUrl(devtoolsUrl);
        } catch (e) {
            error.val = `Failed to open ChromeDebug: ${e.message}`;
        }
    };

    const openWebUi = async () => {
        try {
            await API.openExternalUrl(webUiUrl);
        } catch (e) {
            error.val = `Failed to open Web UI: ${e.message}`;
        }
    };

    const renderEmbeddedView = () =>
        div(
            { class: "danger-zone-header" },
            div({ style: "font-size: 24px; margin-bottom: 20px;" }, "⚠ DEVTOOLS POP-OUT"),
            div("Embedded DevTools is disabled inside the game UI to prevent crashes."),
            div("Use the pop-out window for full DevTools access."),
            button(
                {
                    class: "quick-access-btn",
                    style: "margin: 20px auto 10px; display: block;",
                    onclick: openWebUi,
                },
                "Open Web UI"
            ),
            button(
                {
                    class: "quick-access-btn",
                    style: "margin: 10px auto; display: block;",
                    onclick: openDevTools,
                },
                "Open ChromeDebug"
            ),
            () => (error.val ? div({ style: "color:var(--c-danger); margin-top: 10px;" }, error.val) : null)
        );

    const renderContent = () => {
        if (isEmbedded) {
            return renderEmbeddedView();
        }

        if (error.val) {
            return div(
                { id: "devtools-message", style: "color:var(--c-danger)" },
                `Failed to load DevTools: ${error.val}`
            );
        }

        if (!url.val) {
            return div({ id: "devtools-message" }, "ESTABLISHING UPLINK...");
        }

        return iframe({
            id: "devtools-iframe",
            src: url.val,
            style: "width:100%; height:100%; border:none; background:#fff;",
        });
    };

    return div({ id: "devtools-tab", class: "tab-pane" }, div({ class: "terminal-wrapper" }, renderContent));
};
