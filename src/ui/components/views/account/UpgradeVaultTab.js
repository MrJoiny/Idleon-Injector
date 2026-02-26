/**
 * Upgrade Vault Tab — placeholder
 */

import van from "../../../vendor/van-1.6.0.js";

const { div, span, p } = van.tags;

export const UpgradeVaultTab = () =>
    div({ class: "world-tab" },
        div({ class: "world-tab-header" },
            span({ class: "world-tab-badge" }, "UV"),
            div({ class: "world-tab-title-group" },
                van.tags.h2({ class: "world-tab-title" }, "UPGRADE VAULT"),
                p({ class: "world-tab-subtitle" }, "Account-wide upgrades purchased with vault currency")
            )
        ),
        div({ class: "world-sub-placeholder" },
            span({ class: "world-sub-placeholder__icon" }, "🔒"),
            p({ class: "world-sub-placeholder__label" }, "UPGRADE VAULT — COMING SOON")
        )
    );
