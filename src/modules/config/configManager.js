/**
 * Configuration Management Module
 * 
 * Handles loading, merging, and accessing configuration data for the Idleon Cheat Injector.
 * Manages the hierarchy of base config and custom user overrides, providing a centralized
 * interface for all configuration-related operations throughout the application.
 */

const _ = require('lodash');
const os = require('os');

// Configuration state - holds loaded configuration data in memory
let config = null;
let injectorConfig = null;
let startupCheats = null;
let cheatConfig = null;

// Application constants - default ports for CDP and web server
const CDP_PORT = 32123;
const WEB_PORT = 8080;

/**
 * Load and merge configuration from base config and custom config files
 * @returns {Object} The loaded configuration object
 */
function loadConfiguration() {
  try {
    // Load base configuration - check if we're in src directory or root
    const path = require('path');
    const fs = require('fs');

    let configPath = process.cwd() + '/config.js';
    let customConfigPath = process.cwd() + '/config.custom.js';

    // If we're in the src directory, look in parent directory
    if (!fs.existsSync(configPath)) {
      configPath = path.join(process.cwd(), '../config.js');
      customConfigPath = path.join(process.cwd(), '../config.custom.js');
    }

    config = require(configPath);

    // Try to load custom configuration and merge
    try {
      const customConfig = require(customConfigPath);
      config.injectorConfig = _.merge(config.injectorConfig, customConfig.injectorConfig);
      config.startupCheats = _.union(config.startupCheats, customConfig.startupCheats);
      config.cheatConfig = _.merge(config.cheatConfig, customConfig.cheatConfig);
    } catch (e) {
      console.log('****** No custom config found, using default config ******');
      console.log('****** To create a custom config, copy config.custom.example.js to config.custom.js and edit to your liking ******');
      console.log('');
    }

    // Extract configuration sections
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
    throw new Error('Configuration not loaded. Call loadConfiguration() first.');
  }
  return injectorConfig;
}

/**
 * Get the startup cheats array
 * @returns {Array} The startup cheats array
 */
function getStartupCheats() {
  if (!startupCheats) {
    throw new Error('Configuration not loaded. Call loadConfiguration() first.');
  }
  return startupCheats;
}

/**
 * Get the cheat configuration object
 * @returns {Object} The cheat configuration object
 */
function getCheatConfig() {
  if (!cheatConfig) {
    throw new Error('Configuration not loaded. Call loadConfiguration() first.');
  }
  return cheatConfig;
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
  return WEB_PORT;
}

/**
 * Check if running on Linux platform
 * @returns {boolean} True if running on Linux
 */
function isLinux() {
  return os.platform() === 'linux';
}

/**
 * Get the Linux timeout value from configuration
 * @returns {number} The Linux timeout in milliseconds
 */
function getLinuxTimeout() {
  if (!injectorConfig) {
    throw new Error('Configuration not loaded. Call loadConfiguration() first.');
  }
  return injectorConfig.onLinuxTimeout;
}

module.exports = {
  loadConfiguration,
  getInjectorConfig,
  getStartupCheats,
  getCheatConfig,
  getCdpPort,
  getWebPort,
  isLinux,
  getLinuxTimeout
};