import van from "../../../vendor/van-1.6.0.js";
import vanX from "../../../vendor/van-x-0.6.3.js";
import store from "../../../state/store.js";
import * as API from "../../../services/api.js";

export const configDraftReady = van.state(false);
export const configDraftStatus = vanX.reactive({
    ramDirty: false,
    diskDirty: false,
    savingTarget: null,
});

let draft = null;
let ramSnapshot = null;
let diskSnapshot = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

const setDraftStatus = (ramDirty, diskDirty) => {
    if (configDraftStatus.ramDirty !== ramDirty) configDraftStatus.ramDirty = ramDirty;
    if (configDraftStatus.diskDirty !== diskDirty) configDraftStatus.diskDirty = diskDirty;
    if (store.app.configDirty !== diskDirty) store.setConfigDirty(diskDirty);
};

const getPayload = (source = draft) => {
    if (!source) return null;

    const payload = clone(source);
    delete payload.defaultConfig;
    delete payload.configBaselines;
    return payload;
};

const snapshot = (source = draft) => {
    const payload = getPayload(source);
    return payload ? JSON.stringify(payload) : null;
};

const ramSnapshotFor = (source = draft) => {
    const payload = getPayload(source);
    return payload ? JSON.stringify(payload.cheatConfig || {}) : null;
};

const refreshDraftStatus = () => {
    if (!draft) {
        setDraftStatus(false, false);
        return;
    }

    const currentRamSnapshot = ramSnapshotFor();
    const currentDiskSnapshot = snapshot();
    setDraftStatus(currentRamSnapshot !== ramSnapshot, currentDiskSnapshot !== diskSnapshot);
};

const initializeDraft = (config) => {
    const draftSource = clone(config);
    const baselines = draftSource.configBaselines;
    delete draftSource.configBaselines;

    draft = vanX.reactive(draftSource);
    ramSnapshot = baselines?.ram ? ramSnapshotFor(baselines.ram) : ramSnapshotFor();
    diskSnapshot = baselines?.disk ? snapshot(baselines.disk) : snapshot();
    configDraftReady.val = true;
    refreshDraftStatus();
};

van.derive(() => {
    const config = store.app.config;
    if (config && !draft) initializeDraft(config);
});

van.derive(() => {
    configDraftReady.val;
    refreshDraftStatus();
});

if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", (event) => {
        if (!configDraftStatus.diskDirty) return;

        event.preventDefault();
        event.returnValue = "";
    });
}

/**
 * Ensure the production config is loading and return the shared draft when ready.
 * @returns {object|null}
 */
export const getConfigDraft = () => {
    if (!store.app.config && !store.app.isLoading) store.loadConfig();
    return draft;
};

/**
 * Save the complete shared draft to one explicit destination.
 * @param {"ram"|"disk"} target
 * @returns {Promise<boolean>}
 */
export const saveConfigDraft = async (target) => {
    if (!draft || configDraftStatus.savingTarget) return false;

    const payload = getPayload();
    configDraftStatus.savingTarget = target;

    try {
        const result = target === "disk" ? await API.saveConfigFile(payload) : await API.updateSessionConfig(payload);
        const savedSnapshot = JSON.stringify(payload);

        if (target === "disk") {
            diskSnapshot = savedSnapshot;
        } else if (result?.appliedToGame === true) {
            // The endpoint applies only cheatConfig to the live game. Advance
            // that baseline from the exact acknowledged payload, while the
            // full draft remains independently dirty until saved to disk.
            ramSnapshot = ramSnapshotFor(payload);
        } else {
            refreshDraftStatus();
            store.notify(result?.message || "Configuration was not applied to the game", "error");
            return false;
        }

        refreshDraftStatus();
        store.notify(result?.message || (target === "disk" ? "SAVED TO DISK" : "RAM UPDATED"));
        return true;
    } catch (error) {
        store.notify(error.message || `Failed to save config to ${target}`, "error");
        return false;
    } finally {
        configDraftStatus.savingTarget = null;
    }
};

/**
 * Restore the shared draft to the last version saved on disk.
 * Reactive references are retained so mounted editors keep their DOM identity.
 * @returns {boolean}
 */
export const discardConfigDraft = () => {
    if (!draft || !diskSnapshot || configDraftStatus.savingTarget) return false;

    const replacement = JSON.parse(diskSnapshot);
    if ("defaultConfig" in draft) replacement.defaultConfig = clone(draft.defaultConfig);

    vanX.replace(draft, replacement);
    refreshDraftStatus();
    return true;
};

/**
 * Wrap only the first path level while retaining the draft's reactive references.
 * ConfigNode then follows the narrow template to the exact requested subtree.
 * @param {object} root
 * @param {string[]} pathParts
 * @returns {object}
 */
export const getConfigPathData = (root, pathParts) => {
    if (!pathParts?.length || !root) return root;
    const first = pathParts[0];
    return first in root ? { [first]: root[first] } : {};
};

/**
 * Build a template containing only one exact nested path.
 * @param {object} root
 * @param {string[]} pathParts
 * @returns {object}
 */
export const buildConfigPathTemplate = (root, pathParts) => {
    if (!pathParts?.length || !root) return root;

    let current = root;
    const result = {};
    let node = result;

    for (let index = 0; index < pathParts.length; index++) {
        const part = pathParts[index];
        if (!(part in current)) return {};

        const isLast = index === pathParts.length - 1;
        node[part] = isLast ? current[part] : {};
        node = node[part];
        current = current[part];
    }

    return result;
};
