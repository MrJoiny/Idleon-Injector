import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";

const { div } = van.tags;

const renderers = new Map();
const saveHandlers = new Map();
const revision = van.state(0);

/**
 * Register contextual navigation for a workspace.
 * The renderer must return one DOM node so VanJS can preserve predictable child identity.
 *
 * @param {string} viewId - Workspace ID from VIEWS.
 * @param {() => HTMLElement} renderer - Creates the contextual navigation node.
 * @returns {() => void} Unregister callback.
 */
export const registerWorkspaceContext = (viewId, renderer) => {
    if (!viewId || typeof renderer !== "function") {
        throw new TypeError("Workspace context requires a view ID and renderer");
    }

    renderers.set(viewId, renderer);
    revision.val += 1;

    return () => {
        if (renderers.get(viewId) !== renderer) return;
        renderers.delete(viewId);
        revision.val += 1;
    };
};

/**
 * Register the save action for a workspace-owned draft or inspector.
 * This is the integration point used by the global Ctrl+S shortcut.
 *
 * @param {string} viewId - Workspace ID from VIEWS.
 * @param {() => void|Promise<void>} handler - Workspace save action.
 * @returns {() => void} Unregister callback.
 */
export const registerWorkspaceSaveHandler = (viewId, handler) => {
    if (!viewId || typeof handler !== "function") {
        throw new TypeError("Workspace save action requires a view ID and handler");
    }

    saveHandlers.set(viewId, handler);
    return () => {
        if (saveHandlers.get(viewId) === handler) saveHandlers.delete(viewId);
    };
};

/**
 * Invoke the active workspace save action when one is registered.
 *
 * @param {string} viewId - Workspace ID from VIEWS.
 * @returns {boolean} Whether a workspace save action was invoked.
 */
export const invokeWorkspaceSave = (viewId) => {
    const handler = saveHandlers.get(viewId);
    if (!handler) return false;
    handler();
    return true;
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
