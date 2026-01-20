/**
 * Logger module for the Idleon Cheat Injector
 *
 * Provides structured logging with configurable log levels, console output formatting,
 * and daily rotating log files.
 *
 * Usage:
 *   const log = require("./utils/logger").createLogger("ModuleName");
 *   log.info("Server started");
 *   log.debug("Detailed debug info");
 *   log.warn("Warning message");
 *   log.error("Error occurred", error);
 */

const fs = require("fs");
const path = require("path");

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const ANSI = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
};

function colorsEnabled() {
    if (!process.stdout.isTTY) return false;
    if (process.env.NO_COLOR) return false;
    return true;
}

function colorize(text, colorCode) {
    if (!colorsEnabled()) return text;
    return colorCode + text + ANSI.reset;
}

const URL_PATTERN = /https?:\/\/[^\s]+/g;

const URL_COLOR = ANSI.blue;

function colorizeLinks(message) {
    if (!colorsEnabled()) return message;
    return message.replace(URL_PATTERN, (url) => {
        if (url.includes("legendsofidlone")) return url;
        if (/N\.js(?:[?#]|$)/.test(url)) return url;
        return colorize(url, URL_COLOR);
    });
}

function formatLevelForConsole(level) {
    const upper = level.toUpperCase();
    switch (level) {
        case "debug":
            return colorize(upper, ANSI.gray);
        case "info":
            return colorize(upper, ANSI.cyan);
        case "warn":
            return colorize(upper, ANSI.yellow);
        case "error":
            return colorize(upper, ANSI.bold + ANSI.red);
        default:
            return upper;
    }
}

const LOG_DIR = path.join(process.cwd(), "logs");

let configuredLevel = null;
let configLoaded = false;
let logDirCreated = false;

/**
 * Gets the configured log level from injectorConfig.
 * Uses lazy loading to avoid circular dependency issues.
 * Only caches the level once config is successfully loaded.
 * @returns {string} The configured log level
 */
function getConfiguredLevel() {
    // If config is loaded and cached, return cached value
    if (configLoaded && configuredLevel !== null) {
        return configuredLevel;
    }

    try {
        // Lazy load to avoid circular dependencies during startup
        const { getInjectorConfig } = require("../config/configManager");
        const config = getInjectorConfig();
        if (config && config.logLevel) {
            configuredLevel = config.logLevel;
            configLoaded = true;
        } else {
            // Config loaded but no logLevel set, use default and cache
            configuredLevel = "info";
            configLoaded = true;
        }
    } catch {
        // Config not loaded yet, use default but DON'T cache
        // This allows us to re-check once config is loaded
        return "info";
    }

    return configuredLevel;
}

/**
 * Resets the cached log level. Call this after config changes.
 */
function resetLogLevel() {
    configuredLevel = null;
    configLoaded = false;
}

/**
 * Ensures the log directory exists.
 */
function ensureLogDir() {
    if (logDirCreated) return;

    try {
        if (!fs.existsSync(LOG_DIR)) {
            fs.mkdirSync(LOG_DIR, { recursive: true });
        }
        logDirCreated = true;
    } catch (err) {
        // Silently fail if we can't create log directory
        console.error("Failed to create log directory:", err.message);
    }
}

/**
 * Gets the current timestamp in HH:MM:SS format.
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Gets today's date in YYYY-MM-DD format for log file naming.
 * @returns {string} Formatted date
 */
function getDateStamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Formats a log message in full format.
 * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
 * @param {string} moduleName - Name of the module
 * @param {string} message - Log message
 * @returns {string} Formatted log line
 */
function formatFull(level, moduleName, message) {
    return `${getTimestamp()} - ${level.toUpperCase()} - ${moduleName} - ${message}`;
}

function formatFullConsole(level, moduleName, message) {
    const coloredMessage = colorizeLinks(message);
    return `${getTimestamp()} - ${formatLevelForConsole(level)} - ${moduleName} - ${coloredMessage}`;
}

/**
 * Formats a log message in minimal format.
 * @param {string} moduleName - Name of the module
 * @param {string} message - Log message
 * @returns {string} Formatted log line
 */
function formatMinimal(level, moduleName, message) {
    const coloredMessage = colorizeLinks(message);
    return `${moduleName} - ${coloredMessage}`;
}

/**
 * Formats arguments into a single message string.
 * @param {Array} args - Arguments to format
 * @returns {string} Formatted message
 */
function formatArgs(args) {
    return args
        .map((arg) => {
            if (arg instanceof Error) {
                return arg.stack || arg.message;
            }
            if (typeof arg === "object") {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        })
        .join(" ");
}

/**
 * Writes a log entry to the daily log file.
 * @param {string} formattedMessage - The full formatted log message
 */
function writeToFile(formattedMessage) {
    ensureLogDir();

    const logFile = path.join(LOG_DIR, `idleon-injector-${getDateStamp()}.log`);

    try {
        fs.appendFileSync(logFile, formattedMessage + "\n", "utf8");
    } catch {
        // Silently fail file writes to avoid log loops
    }
}

/**
 * Determines if a message at the given level should be logged.
 * @param {string} level - The log level to check
 * @returns {boolean} Whether the message should be logged
 */
function shouldLog(level) {
    const configured = getConfiguredLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[configured];
}

/**
 * Determines if the console output should use minimal format.
 * Only info level uses minimal format, and only when logLevel is set to "info".
 * @param {string} level - The log level
 * @returns {boolean} Whether to use minimal format
 */
function useMinimalFormat(level) {
    const configured = getConfiguredLevel();
    return level === "info" && configured === "info";
}

/**
 * Creates a logger instance for a specific module.
 * @param {string} moduleName - Name of the module (used in log output)
 * @returns {Object} Logger instance with debug, info, warn, error methods
 */
function createLogger(moduleName) {
    const log = (level, ...args) => {
        if (!shouldLog(level)) return;

        const message = formatArgs(args);
        const fullMessage = formatFull(level, moduleName, message);

        // Always write full (non-colored) format to file
        writeToFile(fullMessage);

        // Console output with appropriate format
        const consoleMessage = useMinimalFormat(level)
            ? formatMinimal(level, moduleName, message)
            : formatFullConsole(level, moduleName, message);

        switch (level) {
            case "debug":
            case "info":
                console.log(consoleMessage);
                break;
            case "warn":
                console.warn(consoleMessage);
                break;
            case "error":
                console.error(consoleMessage);
                break;
        }
    };

    return {
        debug: (...args) => log("debug", ...args),
        info: (...args) => log("info", ...args),
        warn: (...args) => log("warn", ...args),
        error: (...args) => log("error", ...args),
    };
}

module.exports = {
    createLogger,
    resetLogLevel,
};
