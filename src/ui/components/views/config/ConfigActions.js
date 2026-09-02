import van from "../../../vendor/van-1.6.0.js";
import { configDraftStatus, saveConfigDraft } from "../../../state/configDraft.js";
import { withTooltip } from "../../Tooltip.js";

const { div, button, span } = van.tags;

/**
 * Explicit live-cheat/disk-draft controls shared by both Config surfaces.
 * @param {object} [props]
 * @param {boolean} [props.compact]
 * @param {boolean} [props.withIds]
 * @returns {Element}
 */
export const ConfigActions = ({ compact = false, withIds = false } = {}) =>
    div(
        { class: () => `atlas-config-actions ${compact ? "is-compact" : ""}` },
        div(
            { class: "atlas-config-dirty-state", "aria-live": "polite" },
            span({ class: () => `atlas-config-status-chip ${configDraftStatus.ramDirty ? "is-dirty" : ""}` }, () =>
                configDraftStatus.ramDirty ? "Not applied to session" : "Session current"
            ),
            span({ class: () => `atlas-config-status-chip ${configDraftStatus.diskDirty ? "is-dirty" : ""}` }, () =>
                configDraftStatus.diskDirty ? "Not saved to disk" : "Disk current"
            )
        ),
        withTooltip(
            button(
                {
                    ...(withIds ? { id: "update-config-button" } : {}),
                    type: "button",
                    class: "btn-secondary",
                    disabled: () => !configDraftStatus.ramDirty || Boolean(configDraftStatus.savingTarget),
                    onclick: () => saveConfigDraft("ram"),
                },
                () => (configDraftStatus.savingTarget === "ram" ? "APPLYING..." : "APPLY ALL (RAM)")
            ),
            "Apply pending Cheat Config changes to this session. Startup and Injector changes require a disk save."
        ),
        withTooltip(
            button(
                {
                    ...(withIds ? { id: "save-config-button" } : {}),
                    type: "button",
                    class: "btn-primary",
                    disabled: () => !configDraftStatus.diskDirty || Boolean(configDraftStatus.savingTarget),
                    onclick: () => saveConfigDraft("disk"),
                },
                () => (configDraftStatus.savingTarget === "disk" ? "SAVING..." : "SAVE ALL (DISK)")
            ),
            "Save the complete pending draft permanently to config.custom.js"
        )
    );
