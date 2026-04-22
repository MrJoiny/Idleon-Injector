import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { joinClasses, renderAccountError, renderAccountLoading, resolveValue } from "../accountShared.js";
const { div } = van.tags;

/**
 * Shared account page wrapper.
 * - Persistent tabs pass `persistentState` + `body`.
 * - Rebuild-style tabs pass `loadState` + `renderBody`.
 * - `body` is a normal Van child and may itself be a reactive function child.
 */
export const AccountPageShell = ({
    header,
    topNotices = null,
    subNav = null,
    body = null,
    loadState = null,
    renderBody = null,
    renderLoading = renderAccountLoading,
    renderError = renderAccountError,
    rootClass = "tab-container",
    persistentState = null,
    persistentLoadingText = null,
    persistentErrorTitle = "LOAD FAILED",
    persistentInitialWrapperClass = null,
}) =>
    (() => {
        const wrapPersistentInitial = (node) =>
            persistentInitialWrapperClass ? div({ class: persistentInitialWrapperClass }, node) : node;
        const hasLoaded = persistentState ? van.state(false) : null;

        if (persistentState) {
            van.derive(() => {
                const isLoading = Boolean(resolveValue(persistentState.loading));
                const errorMessage = resolveValue(persistentState.error);
                if (!isLoading && !errorMessage) hasLoaded.val = true;
            });
        }

        const initialState = persistentState
            ? [
                  () => {
                      const isLoading = Boolean(resolveValue(persistentState.loading));
                      if (!isLoading || hasLoaded.val) return null;

                      const loader =
                          persistentLoadingText !== null ? Loader({ text: persistentLoadingText }) : Loader();
                      return wrapPersistentInitial(div({ class: "account-loader" }, loader));
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

        const chromeNodes = subNav ? [subNav, header, topNotices] : [header, topNotices];
        const resolvedBody =
            persistentState || !loadState
                ? body
                : () => {
                      const isLoading = Boolean(resolveValue(loadState.loading));
                      if (isLoading) return renderLoading();

                      const errorMessage = resolveValue(loadState.error);
                      if (errorMessage) return renderError(errorMessage);

                      const resolvedData = resolveValue(loadState.data);
                      if (resolvedData === null || resolvedData === undefined) return null;

                      return renderBody(resolvedData);
                  };

        return div(
            { class: rootClass },
            ...chromeNodes,
            ...(initialState ?? []),
            persistentState
                ? div(
                      {
                          class: () =>
                              joinClasses(
                                  "account-page-shell__body",
                                  !hasLoaded.val || resolveValue(persistentState.error) ? "is-hidden-until-ready" : ""
                              ),
                      },
                      body
                  )
                : resolvedBody
        );
    })();
