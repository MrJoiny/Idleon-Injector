import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { FeatureTabFrame } from "./FeatureTabFrame.js";
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
}) =>
    FeatureTabFrame({
        rootClass,
        header:
            header ??
            FeatureTabHeader({
                title,
                description,
                actions,
                wrapActions,
            }),
        topNotices,
        subNav,
        refreshError,
        initialState,
        body: () => {
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
        },
    });
