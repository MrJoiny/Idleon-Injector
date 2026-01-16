/**
 * UI Module
 *
 * Contains:
 * - injectWebUI - In-game overlay injection
 */

import { webPort } from "../core/state.js";

// UI state
let uiContainer = null;
let uiIframe = null;
let isUiExpanded = false;

/**
 * Inject the web UI overlay into the game.
 * Creates a toggleable iframe overlay that loads the cheat UI.
 */
export function injectWebUI() {
    if (uiContainer || webPort === undefined || webPort === null) return;

    uiContainer = document.createElement("div");

    uiContainer.id = "cheat-ui-container";
    uiContainer.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        pointer-events: none;
        overflow: hidden;
    `;

    const toggleBtn = document.createElement("div");
    toggleBtn.id = "cheat-ui-toggle";
    toggleBtn.innerHTML = "CHEATS";

    const defaultBtnStyle = `
        background: linear-gradient(180deg, #161821, #0e0f14);
        color: #ffb700;
        padding: 0 20px;
        height: 32px;
        line-height: 32px;
        cursor: pointer;
        border-radius: 0 0 8px 8px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 2px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        border: 1px solid #2a2b36;
        border-top: none;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.2, 0.6, 0.3, 1);
        pointer-events: auto;
        text-shadow: 0 0 10px rgba(255, 183, 0, 0.3);
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483649;
        text-align: center;
        -webkit-app-region: no-drag;
    `;

    const expandedBtnStyle = `
        background: #ffb700;
        color: #050507;
        padding: 10px 24px;
        cursor: pointer;
        border-radius: 2px;
        font-family: 'Rajdhani', sans-serif;
        font-weight: 700;
        font-size: 14px;
        letter-spacing: 1px;
        box-shadow: 0 0 20px rgba(255, 183, 0, 0.2);
        border: none;
        user-select: none;
        transition: all 0.2s cubic-bezier(0.2, 0.6, 0.3, 1);
        pointer-events: auto;
        position: absolute;
        top: 20px;
        right: 30px;
        transform: none;
        z-index: 2147483649;
        text-transform: uppercase;
        height: auto;
        line-height: normal;
        -webkit-app-region: no-drag;
    `;

    toggleBtn.style.cssText = defaultBtnStyle;

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

    uiIframe = document.createElement("iframe");
    uiIframe.src = `http://localhost:${webPort}`;
    uiIframe.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100vw;
        height: 100vh;
        border: none;
        transform: translateY(-100%);
        transition: transform 0.6s cubic-bezier(0.05, 0.7, 0.1, 1);
        background: #050507;
        box-shadow: 0 10px 30px rgba(0,0,0,0.7);
        pointer-events: auto;
        z-index: 2147483648;
    `;

    toggleBtn.onclick = () => {
        isUiExpanded = !isUiExpanded;
        if (isUiExpanded) {
            uiIframe.style.transform = "translateY(0)";
            toggleBtn.innerHTML = "CLOSE";
            toggleBtn.style.cssText = expandedBtnStyle;
        } else {
            uiIframe.style.transform = "translateY(-100%)";
            toggleBtn.innerHTML = "CHEATS";
            toggleBtn.style.cssText = defaultBtnStyle;
        }
    };

    uiContainer.appendChild(uiIframe);
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
