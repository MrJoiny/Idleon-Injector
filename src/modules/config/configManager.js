/**
 * Configuration Management Module
 *
 * Handles loading, merging, and accessing configuration data for the Idleon Cheat Injector.
 * Manages the hierarchy of base config and custom user overrides, providing a centralized
 * interface for all configuration-related operations throughout the application.
 */

const { deepClone, union, deepMerge } = require("../utils/objectUtils");
const { validateConfig } = require("../utils/helpers");
const os = require("os");
const { createLogger } = require("../utils/logger");

const log = createLogger("Config");

let config = null;
let defaultConfig = null;
let injectorConfig = null;
let startupCheats = null;
let cheatConfig = null;

const CDP_PORT = 32123;
const WEB_PORT = 8080;

/**
 * Load and merge configuration from base config and custom config files
 * @returns {Object} The loaded configuration object
 */
function loadConfiguration() {
    try {
        const path = require("path");
        const fs = require("fs");

        let configPath = process.cwd() + "/config.js";
        let customConfigPath = process.cwd() + "/config.custom.js";

        if (!fs.existsSync(configPath)) {
            configPath = path.join(process.cwd(), "../config.js");
            customConfigPath = path.join(process.cwd(), "../config.custom.js");
        }

        config = require(configPath);

        defaultConfig = deepClone(config);

        try {
            const customConfig = require(customConfigPath);

            if (customConfig.injectorConfig) {
                validateConfig(config.injectorConfig, customConfig.injectorConfig, "injectorConfig");
                config.injectorConfig = deepMerge(config.injectorConfig, customConfig.injectorConfig);
            }

            if (customConfig.startupCheats) {
                if (Array.isArray(customConfig.startupCheats)) {
                    config.startupCheats = union(config.startupCheats, customConfig.startupCheats);
                } else {
                    log.error("startupCheats must be an array, received '" + typeof customConfig.startupCheats + "'");
                }
            }

            if (customConfig.cheatConfig) {
                validateConfig(config.cheatConfig, customConfig.cheatConfig, "");
                config.cheatConfig = deepMerge(config.cheatConfig, customConfig.cheatConfig);
            }

            log.debug("Loaded custom config overrides");
        } catch {
            log.info("No config.custom.js found - using defaults");
        }

        injectorConfig = config.injectorConfig;
        startupCheats = config.startupCheats;
        cheatConfig = config.cheatConfig;

        return config;
    } catch (error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
    }
}

/**
 * Get the injector configuration
 * @returns {Object} The injector configuration object
 */
function getInjectorConfig() {
    if (!injectorConfig) {
        throw new Error("Configuration not loaded. Call loadConfiguration() first");
    }
    return injectorConfig;
}

/**
 * Get the startup cheats array
 * @returns {Array} The startup cheats array
 */
function getStartupCheats() {
    if (!startupCheats) {
        throw new Error("Configuration not loaded. Call loadConfiguration() first");
    }
    return startupCheats;
}

/**
 * Get the cheat configuration object
 * @returns {Object} The cheat configuration object
 */
function getCheatConfig() {
    if (!cheatConfig) {
        throw new Error("Configuration not loaded. Call loadConfiguration() first");
    }
    return cheatConfig;
}

/**
 * Get the default configuration object (as defined in config.js)
 * @returns {Object} The default configuration object
 */
function getDefaultConfig() {
    if (!defaultConfig) {
        throw new Error("Configuration not loaded. Call loadConfiguration() first");
    }
    return defaultConfig;
}

/**
 * Get the Chrome DevTools Protocol port
 * @returns {number} The CDP port number
 */
function getCdpPort() {
    return CDP_PORT;
}

/**
 * Get the web server port
 * @returns {number} The web server port number
 */
function getWebPort() {
    if (injectorConfig && injectorConfig.webPort) {
        return injectorConfig.webPort;
    }
    log.debug("Using fallback port: " + WEB_PORT);
    return WEB_PORT;
}

/**
 * Check if running on Linux platform
 * @returns {boolean} True if running on Linux
 */
function isLinux() {
    return os.platform() === "linux";
}

/**
 * Get the Linux timeout value from configuration
 * @returns {number} The Linux timeout in milliseconds
 */
function getLinuxTimeout() {
    if (!injectorConfig) {
        throw new Error("Configuration not loaded. Call loadConfiguration() first");
    }
    return injectorConfig.onLinuxTimeout;
}

module.exports = {
    loadConfiguration,
    getInjectorConfig,
    getStartupCheats,
    getCheatConfig,
    getDefaultConfig,
    getCdpPort,
    getWebPort,
    isLinux,
    getLinuxTimeout,
};
