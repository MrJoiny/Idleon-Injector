/**
 * UI Module
 *
 * Contains:
 * - injectWebUI - In-game overlay injection
 */

import { webPort } from "../core/state.js";

// UI constants
const Z_INDEX_BASE = 1000000;
const TRANSITION_SETTINGS = "0.6s cubic-bezier(0.05, 0.7, 0.1, 1)";
const LOAD_HINT_DELAY_MS = 2500;

const STYLES = {
    container: `
        position: fixed;
        inset: 0;
        z-index: ${Z_INDEX_BASE};
        pointer-events: none;
        overflow: hidden;
    `,
    iframe: `
        position: absolute;
        inset: 0;
        width: 100vw;
        height: 100vh;
        border: none;
        transform: translateY(-100%);
        transition: transform ${TRANSITION_SETTINGS};
        background: #050507;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        pointer-events: auto;
        z-index: ${Z_INDEX_BASE + 1};
    `,
    loadHint: `
        position: absolute;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        max-width: min(90vw, 680px);
        width: max-content;
        padding: 10px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255, 183, 0, 0.4);
        background: rgba(8, 10, 16, 0.86);
        color: #f4f6ff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        line-height: 1.3;
        letter-spacing: 0.3px;
        text-align: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: ${Z_INDEX_BASE + 3};
    `,
    buttonBase: `
        font-family: 'Rajdhani', sans-serif;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        user-select: none;
        pointer-events: auto;
        z-index: ${Z_INDEX_BASE + 2};
        transition: all ${TRANSITION_SETTINGS};
        -webkit-app-region: no-drag;
        text-align: center;
    `,
    buttonDefault: `
        background: linear-gradient(180deg, #161821, #0e0f14);
        color: #ffb700;
        padding: 0 20px;
        height: 32px;
        line-height: 32px;
        border-radius: 0 0 8px 8px;
        letter-spacing: 2px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        border: 1px solid #2a2b36;
        border-top: none;
        text-shadow: 0 0 10px rgba(255, 183, 0, 0.3);
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
    `,
    buttonExpanded: `
        background: #ffb700;
        color: #050507;
        padding: 10px 24px;
        height: auto;
        line-height: normal;
        border-radius: 2px;
        letter-spacing: 1px;
        box-shadow: 0 0 20px rgba(255, 183, 0, 0.2);
        border: none;
        position: absolute;
        top: 20px;
        right: 30px;
        transform: none;
        text-transform: uppercase;
    `,
};

// UI state
let uiContainer = null;
let uiIframe = null;
let isUiExpanded = false;
let loadHintTimer = null;

/**
 * Inject the web UI overlay into the game.
 * Creates a toggleable iframe overlay that loads the cheat UI.
 */
export function injectWebUI() {
    if (uiContainer || webPort === undefined || webPort === null) return;

    uiContainer = document.createElement("div");
    uiContainer.id = "cheat-ui-container";
    uiContainer.style.cssText = STYLES.container;

    uiIframe = document.createElement("iframe");
    uiIframe.src = `http://localhost:${webPort}`;
    uiIframe.style.cssText = STYLES.iframe;

    const loadHint = document.createElement("div");
    loadHint.id = "cheat-ui-load-hint";
    loadHint.style.cssText = STYLES.loadHint;
    loadHint.textContent = "";

    let iframeLoaded = false;

    const hideLoadHint = () => {
        if (loadHintTimer) {
            clearTimeout(loadHintTimer);
            loadHintTimer = null;
        }
        loadHint.style.opacity = "0";
        loadHint.style.pointerEvents = "none";
    };

    const showLoadHint = (message) => {
        loadHint.innerHTML = message;
        loadHint.style.opacity = "1";
        loadHint.style.pointerEvents = "auto";
    };

    loadHintTimer = setTimeout(() => {
        if (!iframeLoaded) {
            showLoadHint(
                `UI is taking longer than expected. If the panel stays black, open <b>http://localhost:${webPort}</b> in your browser to verify it.`
            );
        }
    }, LOAD_HINT_DELAY_MS);

    uiIframe.onload = () => {
        iframeLoaded = true;
        hideLoadHint();
    };

    uiIframe.onerror = () => {
        showLoadHint(`Unable to load UI from <b>http://localhost:${webPort}</b>. Check the web server status.`);
    };

    const toggleBtn = document.createElement("div");
    toggleBtn.id = "cheat-ui-toggle";
    toggleBtn.innerHTML = "CHEATS";
    toggleBtn.style.cssText = STYLES.buttonBase + STYLES.buttonDefault;

    toggleBtn.onmouseover = () => {
        if (!isUiExpanded) {
            toggleBtn.style.background = "#161821";
            toggleBtn.style.color = "#ffe066";
            toggleBtn.style.boxShadow = "0 4px 20px rgba(255, 183, 0, 0.15)";
            toggleBtn.style.height = "36px";
        } else {
            toggleBtn.style.background = "#ffe066";
            toggleBtn.style.boxShadow = "0 0 25px rgba(255, 183, 0, 0.4)";
        }
    };

    toggleBtn.onmouseout = () => {
        if (!isUiExpanded) {
            toggleBtn.style.background = "linear-gradient(180deg, #161821, #0e0f14)";
            toggleBtn.style.color = "#ffb700";
            toggleBtn.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
            toggleBtn.style.height = "32px";
        } else {
            toggleBtn.style.background = "#ffb700";
            toggleBtn.style.boxShadow = "0 0 20px rgba(255, 183, 0, 0.2)";
        }
    };

    toggleBtn.onclick = () => {
        isUiExpanded = !isUiExpanded;
        if (isUiExpanded) {
            uiIframe.style.transform = "translateY(0)";
            toggleBtn.innerHTML = "CLOSE";
            toggleBtn.style.cssText = STYLES.buttonBase + STYLES.buttonExpanded;
        } else {
            uiIframe.style.transform = "translateY(-100%)";
            toggleBtn.innerHTML = "CHEATS";
            toggleBtn.style.cssText = STYLES.buttonBase + STYLES.buttonDefault;
        }
    };

    uiContainer.appendChild(uiIframe);
    uiContainer.appendChild(loadHint);
    uiContainer.appendChild(toggleBtn);
    document.body.appendChild(uiContainer);
}

/**
 * Check if the UI is currently expanded.
 * @returns {boolean}
 */
export function isUIExpanded() {
    return isUiExpanded;
}

/**
 * Toggle the UI visibility.
 */
export function toggleUI() {
    if (uiContainer) {
        const toggleBtn = document.getElementById("cheat-ui-toggle");
        if (toggleBtn) {
            toggleBtn.click();
        }
    }
}
