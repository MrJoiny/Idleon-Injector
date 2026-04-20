import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { resolveValue } from "../featureShared.js";
const { div } = van.tags;

/**
 * Shared account page wrapper with standard async-state rendering.
 * `body` is a normal Van child and may itself be a reactive function child.
 * The shell must pass it through as-is rather than invoking it.
 */
export const AccountPageShell = ({
    header,
    topNotices = null,
    subNav = null,
    body = null,
    rootClass = "tab-container feature-tab-frame",
    persistentState = null,
    persistentLoadingText = null,
    persistentErrorTitle = "LOAD FAILED",
    persistentInitialWrapperClass = null,
}) =>
    (() => {
        const wrapPersistentInitial = (node) =>
            persistentInitialWrapperClass ? div({ class: persistentInitialWrapperClass }, node) : node;

        const initialState = persistentState
            ? [
                  () => {
                      const isLoading = Boolean(resolveValue(persistentState.loading));
                      const isInitialized = Boolean(resolveValue(persistentState.initialized));
                      if (!isLoading || isInitialized) return null;

                      const loader =
                          persistentLoadingText !== null ? Loader({ text: persistentLoadingText }) : Loader();
                      return wrapPersistentInitial(div({ class: "feature-loader" }, loader));
                  },
                  () => {
                      const isLoading = Boolean(resolveValue(persistentState.loading));
                      const errorMessage = resolveValue(persistentState.error);
                      if (isLoading || !errorMessage) return null;

                      return wrapPersistentInitial(
                          EmptyState({
                              icon: Icons.SearchX(),
                              title: persistentErrorTitle,
                              subtitle: String(errorMessage),
                          })
                      );
                  },
              ]
            : null;

        return div(
            { class: rootClass },
            header,
            topNotices,
            subNav,
            initialState,
            persistentState
                ? div(
                      {
                          class: () => (resolveValue(persistentState.error) ? "is-hidden-until-ready" : ""),
                      },
                      body
                  )
                : body
        );
    })();
