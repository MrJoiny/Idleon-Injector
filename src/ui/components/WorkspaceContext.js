import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";

const { div } = van.tags;

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
 * Render the active workspace's registered context, or the supplied fallback.
 *
 * @param {{fallback: (viewId: string) => HTMLElement}} props
 * @returns {HTMLElement}
 */
export const WorkspaceContextSlot = ({ fallback }) =>
    div({ class: "atlas-context-slot", id: "atlas-workspace-context" }, () => {
        revision.val;
        const viewId = store.app.activeTab;
        const renderer = renderers.get(viewId);
        return renderer ? renderer() : fallback(viewId);
    });
