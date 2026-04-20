import van from "../../../../vendor/van-1.6.0.js";
import { joinClasses, resolveValue, toNodes } from "../accountShared.js";

const { div, span } = van.tags;

/**
 * Shared non-numeric row shell for account feature tabs.
 */
export const AccountRow = ({
    info,
    badge = null,
    controls = null,
    rowClass = "",
    badgeClass = "",
    controlsClass = "",
    status = null,
}) =>
    div(
        {
            class: () => {
                const resolvedStatus = resolveValue(status);
                return joinClasses(
                    "account-row",
                    typeof rowClass === "function" ? rowClass() : rowClass,
                    resolvedStatus === "success" ? "account-row--success" : "",
                    resolvedStatus === "error" ? "account-row--error" : ""
                );
            },
        },
        div({ class: "account-row__info" }, ...toNodes(info)),
        badge !== null
            ? span(
                  {
                      class: () =>
                          joinClasses(
                              "account-row__badge",
                              typeof badgeClass === "function" ? badgeClass() : badgeClass
                          ),
                  },
                  ...toNodes(badge)
              )
            : null,
        controls !== null
            ? div(
                  {
                      class: () =>
                          joinClasses(
                              "account-row__controls",
                              typeof controlsClass === "function" ? controlsClass() : controlsClass
                          ),
                  },
                  ...toNodes(controls)
              )
            : null
    );


