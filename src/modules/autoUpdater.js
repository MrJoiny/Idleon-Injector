const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { getRuntimeBaseDir } = require("./utils/runtimePaths");
const { createLogger } = require("./utils/logger");

const log = createLogger("AutoUpdater");

const MAX_REDIRECTS = 5;
const UPDATE_FILES = ["cheats.js", "config.js"];
const RELEASE_ARCHIVES = {
    win32: [{ name: "InjectCheatsUI-Windows.zip" }],
    linux: [{ name: "InjectCheatsUI-Linux.tar.gz" }],
    darwin: [
        { arch: "arm64", name: "InjectCheatsUI-macOS-arm64.tar.gz" },
        { arch: "x64", name: "InjectCheatsUI-macOS-x64.tar.gz" },
    ],
};

/**
 * Download a file from a URL, following HTTP redirects.
 * @param {string} url - URL to download
 * @param {string} destPath - Local file path to write to
 * @param {number} [redirectCount=0] - Current redirect depth
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > MAX_REDIRECTS) {
            return reject(new Error("Too many redirects"));
        }

        const requestUrl = new URL(url);
        const options = {
            hostname: requestUrl.hostname,
            path: requestUrl.pathname + requestUrl.search,
            method: "GET",
            headers: { "User-Agent": "Idleon-Injector-AutoUpdater" },
        };

        const handler = (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(downloadFile(res.headers.location, destPath, redirectCount + 1));
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Download failed with status ${res.statusCode}`));
            }

            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
            file.on("error", (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        };

        const transport = requestUrl.protocol === "https:" ? https : http;
        const req = transport.request(options, handler);
        req.on("error", reject);
        req.end();
    });
}

/**
 * Extract a packaged release archive using platform-native tools.
 * @param {string} archivePath - Path to the archive file
 * @param {string} destDir - Directory to extract into
 */
function extractArchive(archivePath, destDir) {
    if (archivePath.endsWith(".zip")) {
        if (process.platform !== "win32") {
            execFileSync("unzip", ["-o", archivePath, "-d", destDir], { stdio: "pipe" });
            return;
        }

        execFileSync(
            "powershell",
            ["-NoProfile", "-Command", `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`],
            { stdio: "pipe" }
        );
        return;
    }

    if (archivePath.endsWith(".tar.gz") || archivePath.endsWith(".tgz")) {
        execFileSync("tar", ["-xzf", archivePath, "-C", destDir], { stdio: "pipe" });
        return;
    }

    throw new Error(`Unsupported update archive format: ${path.basename(archivePath)}`);
}

/**
 * Recursively search a directory for a file by name.
 * @param {string} dir - Directory to search
 * @param {string} filename - File name to find
 * @returns {string|null} Full path if found
 */
function findFileRecursive(dir, filename) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === filename) return fullPath;
        if (entry.isDirectory()) {
            const found = findFileRecursive(fullPath, filename);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Pick the packaged release archive for the current platform.
 * @param {Array<{name: string, url: string}>} assets
 * @param {string[]} expectedNames - Expected archive filenames for the current platform
 * @returns {{name: string, url: string}|null}
 */
function findReleaseAsset(assets, expectedNames) {
    if (!assets || assets.length === 0 || expectedNames.length === 0) return null;

    for (const expectedName of expectedNames) {
        const asset = assets.find((candidate) => candidate.name === expectedName);
        if (asset) return asset;
    }

    return null;
}

/**
 * Generate a Windows batch script that replaces files after the main process exits.
 * @param {string} tempDir - Temp directory containing extracted files
 * @param {Array<{src: string, dest: string}>} updateFiles
 * @returns {string} Path to the generated script
 */
function generateWindowsScript(tempDir, updateFiles) {
    const scriptPath = path.join(tempDir, "update.bat");
    const lines = ["@echo off", "title Idleon Injector - Updating...", "timeout /t 2 /nobreak >NUL"];

    for (const { src, dest } of updateFiles) {
        lines.push(`copy /Y "${src}" "${dest}" >NUL`);
    }

    fs.writeFileSync(scriptPath, lines.join("\r\n"), "utf8");
    return scriptPath;
}

/**
 * Generate a Unix shell script that replaces files after the main process exits.
 * @param {string} tempDir - Temp directory containing extracted files
 * @param {string} appDir - Application directory to copy files into
 * @param {string} binaryName - Name of the binary executable
 * @param {Array<{src: string, dest: string}>} updateFiles
 * @returns {string} Path to the generated script
 */
function generateUnixScript(tempDir, appDir, binaryName, updateFiles) {
    const scriptPath = path.join(tempDir, "update.sh");
    const lines = ["#!/bin/bash", "sleep 1"];

    for (const { src, dest } of updateFiles) {
        lines.push(`cp "${src}" "${dest}"`);
    }

    if (binaryName) {
        const binaryPath = path.join(appDir, binaryName);
        lines.push(`chmod +x "${binaryPath}" 2>/dev/null`);
    }

    fs.writeFileSync(scriptPath, lines.join("\n"), "utf8");
    fs.chmodSync(scriptPath, "755");
    return scriptPath;
}

/**
 * Prepare an update so the application can close only after the update is ready.
 * @param {Object} releaseInfo - Release info from checkForUpdates (must include assets)
 * @returns {Promise<{scriptPath: string, updatedFileNames: string}>}
 */
async function performUpdate(releaseInfo) {
    if (!process.pkg) {
        throw new Error("Auto-update is only available in packaged builds.");
    }

    const appDir = getRuntimeBaseDir();
    const binaryName = path.basename(process.execPath);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "idleon-update-"));
    const platform = process.platform;
    const architecture = process.arch;
    const platformArchives = RELEASE_ARCHIVES[platform] || [];
    const compatibleArchives = platformArchives.filter((archive) => !archive.arch || archive.arch === architecture);
    const expectedArchiveNames = compatibleArchives.map((archive) => archive.name);

    const releaseAsset = findReleaseAsset(releaseInfo.assets, expectedArchiveNames);
    if (!releaseAsset) {
        throw new Error(
            `No packaged release archive found for ${platform}/${architecture}. Expected one of: ${expectedArchiveNames.join(
                ", "
            )}`
        );
    }

    const archivePath = path.join(tempDir, releaseAsset.name);

    log.info("Downloading update...");
    await downloadFile(releaseAsset.url, archivePath);

    log.info("Extracting update...");
    const extractDir = path.join(tempDir, "extracted");
    fs.mkdirSync(extractDir);
    extractArchive(archivePath, extractDir);

    const requiredFiles = [...UPDATE_FILES];
    if (binaryName) requiredFiles.push(binaryName);

    const updateFiles = [];
    for (const filename of requiredFiles) {
        const extractedFilePath = findFileRecursive(extractDir, filename);
        if (extractedFilePath) {
            updateFiles.push({ src: extractedFilePath, dest: path.join(appDir, filename) });
        } else {
            log.warn(`File not found in update archive: ${filename}`);
        }
    }

    if (updateFiles.length === 0) {
        throw new Error("No update files found in the downloaded archive");
    }

    const updatedFileNames = updateFiles.map((file) => path.basename(file.dest)).join(", ");
    log.info(`Updating ${updateFiles.length} file(s): ${updatedFileNames}`);

    return {
        scriptPath:
            process.platform === "win32"
                ? generateWindowsScript(tempDir, updateFiles)
                : generateUnixScript(tempDir, appDir, binaryName, updateFiles),
        updatedFileNames,
    };
}

module.exports = { performUpdate };
