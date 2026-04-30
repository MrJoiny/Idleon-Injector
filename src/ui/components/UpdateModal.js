import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { IS_ELECTRON } from "../state/constants.js";

const { div, h3, p, button, a, span } = van.tags;

export const UpdateModal = () => {
    const hiddenUnless = (condition) => (condition ? "" : "is-hidden");
    const updateInfo = () => store.app.updateInfo || {};

    const openReleaseLink = (event, url) => {
        if (!IS_ELECTRON) return;

        event.preventDefault();
        store.openExternalUrl(url);
    };

    return div(
        {
            class: () =>
                `modal update-modal ${hiddenUnless(store.app.updateModalOpen && updateInfo().updateAvailable)}`,
            onclick: () => store.closeUpdateModal(),
        },
        div(
            { class: "modal-box update-modal-box", onclick: (event) => event.stopPropagation() },
            div({ class: "modal-header" }, h3("Update Available")),
            div(
                { class: "modal-body update-modal-body" },
                div(
                    { class: "update-version-row" },
                    span({ class: "update-version-label" }, "Current"),
                    span({ class: "update-version-value" }, () => `v${updateInfo().currentVersion || ""}`)
                ),
                div(
                    { class: "update-version-row" },
                    span({ class: "update-version-label" }, "Newest"),
                    span({ class: "update-version-value update-version-new" }, () => updateInfo().latestVersion || "")
                ),
                p(
                    { class: "update-modal-warning" },
                    "Updating will close the app and game. Restart the app manually after it exits."
                ),
                p(
                    {
                        class: () =>
                            `update-modal-warning ${hiddenUnless(updateInfo().canApplyUpdate === false)}`,
                    },
                    "Auto-update is only available in packaged builds."
                ),
                a(
                    {
                        class: () => `update-release-link ${hiddenUnless(updateInfo().url)}`,
                        href: () => updateInfo().url || "#",
                        target: "_blank",
                        onclick: (event) => openReleaseLink(event, updateInfo().url || "#"),
                    },
                    "GitHub release"
                )
            ),
            div(
                { class: "modal-footer" },
                button(
                    {
                        id: "modal-cancel",
                        type: "button",
                        disabled: () => store.app.updateApplying,
                        onclick: () => store.closeUpdateModal(),
                    },
                    "Deny"
                ),
                button(
                    {
                        id: "modal-accept",
                        type: "button",
                        disabled: () => store.app.updateApplying || !updateInfo().canApplyUpdate,
                        onclick: () => store.applyUpdate(),
                    },
                    () => (store.app.updateApplying ? "Preparing..." : "Accept")
                )
            )
        )
    );
};
