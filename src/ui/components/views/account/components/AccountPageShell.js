import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { FeatureTabHeader } from "./FeatureTabHeader.js";

const { div } = van.tags;

const resolveValue = (valueOrState) => {
    if (typeof valueOrState === "function") return valueOrState();
    if (valueOrState && typeof valueOrState === "object" && "val" in valueOrState) return valueOrState.val;
    return valueOrState;
};

const renderNode = (renderer, arg = undefined) => {
    if (typeof renderer === "function") return renderer(arg);
    return renderer ?? null;
};

/**
 * Shared account page wrapper with standard async-state rendering.
 */
export const AccountPageShell = ({
    header = null,
    title,
    description = null,
    actions = null,
    topNotices = null,
    subNav = null,
    initialState = null,
    loading = false,
    error = null,
    isEmpty = false,
    refreshError = null,
    renderLoading = null,
    renderError = null,
    renderEmpty = null,
    renderBody,
    body = null,
    rootClass = "tab-container feature-tab-frame",
    wrapActions = true,
    persistentState = null,
    persistentLoadingText = null,
    persistentErrorTitle = "LOAD FAILED",
    persistentInitialWrapperClass = null,
}) =>
    (() => {
        const wrapPersistentInitial = (node) =>
            persistentInitialWrapperClass ? div({ class: persistentInitialWrapperClass }, node) : node;

        const resolvedRefreshError =
            refreshError ??
            (persistentState?.refreshError
                ? () => {
                      const message = resolveValue(persistentState.refreshError);
                      return message
                          ? div(
                                { class: "warning-banner" },
                                Icons.Warning(),
                                " Refresh failed. Showing last loaded values. ",
                                message
                            )
                          : null;
                  }
                : null);

        const resolvedInitialState =
            initialState ??
            (persistentState
                ? [
                      () => {
                          const isLoading = Boolean(resolveValue(persistentState.loading));
                          const isInitialized = Boolean(resolveValue(persistentState.initialized));
                          if (!isLoading || isInitialized) return null;

                          const loader =
                              persistentLoadingText !== null
                                  ? Loader({ text: persistentLoadingText })
                                  : Loader();
                          return wrapPersistentInitial(div({ class: "feature-loader" }, loader));
                      },
                      () => {
                          const isLoading = Boolean(resolveValue(persistentState.loading));
                          const isInitialized = Boolean(resolveValue(persistentState.initialized));
                          const errorMessage = resolveValue(persistentState.error);
                          if (isLoading || isInitialized || !errorMessage) return null;

                          return wrapPersistentInitial(
                              EmptyState({
                                  icon: Icons.SearchX(),
                                  title: persistentErrorTitle,
                                  subtitle: String(errorMessage),
                              })
                          );
                      },
                  ]
                : null);

        return div(
            { class: rootClass },
            header ??
                FeatureTabHeader({
                    title,
                    description,
                    actions,
                    wrapActions,
                }),
            topNotices,
            subNav,
            resolvedRefreshError,
            resolvedInitialState,
            () => {
                const isLoading = Boolean(resolveValue(loading));
                const errorMessage = resolveValue(error);
                const empty = Boolean(resolveValue(isEmpty));
                const resolvedBody = renderBody ?? body;

                if (isLoading) {
                    return renderNode(renderLoading) ?? div({ class: "feature-loader" }, Loader());
                }

                if (errorMessage) {
                    return (
                        renderNode(renderError, errorMessage) ??
                        EmptyState({
                            icon: Icons.SearchX(),
                            title: "LOAD FAILED",
                            subtitle: String(errorMessage),
                        })
                    );
                }

                if (empty) {
                    return (
                        renderNode(renderEmpty) ??
                        EmptyState({
                            icon: Icons.SearchX(),
                            title: "NO DATA",
                            subtitle: "Nothing to display.",
                        })
                    );
                }

                return renderNode(resolvedBody);
            }
        );
    })();
