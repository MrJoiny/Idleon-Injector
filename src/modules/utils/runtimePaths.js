const path = require("path");

/**
 * Resolve the base directory for user-writable runtime files.
 * Packaged builds use the executable directory; source runs use cwd.
 * @returns {string} Runtime base directory
 */
function getRuntimeBaseDir() {
    if (process.pkg) {
        return path.dirname(process.execPath);
    }

    return process.cwd();
}

/**
 * Resolve a path inside the runtime base directory.
 * @param {...string} parts - Path segments
 * @returns {string} Resolved runtime path
 */
function getRuntimePath(...parts) {
    return path.join(getRuntimeBaseDir(), ...parts);
}

module.exports = {
    getRuntimeBaseDir,
    getRuntimePath,
};
