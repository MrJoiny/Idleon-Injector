import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";

const { aside } = van.tags;

const renderers = new Map();
const revision = van.state(0);

/**
 * Register contextual navigation for a workspace.
 * The renderer must return one DOM node so VanJS can preserve predictable child identity.
 *
 * @param {string} viewId - Workspace ID from VIEWS.
 * @param {() => HTMLElement} renderer - Creates the contextual navigation node.
 * @returns {void}
 */
export const registerWorkspaceContext = (viewId, renderer) => {
    renderers.set(viewId, renderer);
    revision.val += 1;
};

/**
 * Render contextual navigation for the active workspace when it registers one.
 *
 * @returns {HTMLElement}
 */
export const WorkspaceContextSidebar = () =>
    aside(
        {
            class: () => {
                revision.val;
                return `atlas-context-sidebar${renderers.has(store.app.activeTab) ? "" : " is-empty"}`;
            },
            id: "atlas-workspace-context",
            "aria-label": "Page context",
            "aria-hidden": () => {
                revision.val;
                return !renderers.has(store.app.activeTab);
            },
        },
        () => {
            revision.val;
            return renderers.get(store.app.activeTab)?.() ?? "";
        }
    );
