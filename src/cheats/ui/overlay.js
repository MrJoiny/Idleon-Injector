/**
 * UI Module
 *
 * Contains:
 * - injectWebUI - In-game overlay injection
 */

import { webPort } from "../core/state.js";

// UI constants
const Z_INDEX_BASE = 1000000;
const TRANSITION_SETTINGS = "0.25s cubic-bezier(0.16, 1, 0.3, 1)";

function getStyles(menuOffset = 0) {
    return {
        container: `
            position: fixed;
            top: ${menuOffset}px;
            left: 0;
            right: 0;
            bottom: 0;
            height: calc(100vh - ${menuOffset}px);
            z-index: ${Z_INDEX_BASE};
            pointer-events: none;
            overflow: hidden;
        `,
        iframe: `
            position: absolute;
            inset: 0;
            width: 100vw;
            height: 100%;
            border: none;
            transform: translateY(-100%);
            transition: transform ${TRANSITION_SETTINGS};
            background: #10121a;
            box-shadow: 0 10px 30px rgba(0,0,0,0.7);
            pointer-events: auto;
            z-index: ${Z_INDEX_BASE + 1};
        `,
        buttonBase: `
            font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            pointer-events: auto;
            z-index: ${Z_INDEX_BASE + 2};
            transition: all 0.2s ease;
            -webkit-app-region: no-drag;
            text-align: center;
            box-sizing: border-box;
        `,
        buttonDefault: `
            background: #090b14;
            color: #c8cede;
            padding: 0 16px;
            height: 28px;
            line-height: 26px;
            border-radius: 0 0 8px 8px;
            letter-spacing: 0.06em;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
            border: 1px solid #293043;
            border-top: none;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
        `,
        buttonExpanded: `
            background: rgba(217, 67, 95, 0.15);
            color: #ff7189;
            padding: 0 14px;
            height: 32px;
            line-height: 30px;
            border-radius: 7px;
            letter-spacing: 0.04em;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 113, 137, 0.3);
            position: absolute;
            top: 8px;
            right: 12px;
            transform: none;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
        `,
    };
}

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

    const menuBar = document.getElementById("menuBar");
    const menuOffset = menuBar ? menuBar.offsetHeight : 0;
    const styles = getStyles(menuOffset);

    uiContainer = document.createElement("div");
    uiContainer.id = "cheat-ui-container";
    uiContainer.style.cssText = styles.container;

    uiIframe = document.createElement("iframe");
    uiIframe.src = `http://localhost:${webPort}`;
    uiIframe.style.cssText = styles.iframe;

    const toggleBtn = document.createElement("div");
    toggleBtn.id = "cheat-ui-toggle";
    toggleBtn.innerHTML = "CHEATS";
    toggleBtn.style.cssText = styles.buttonBase + styles.buttonDefault;

    toggleBtn.onmouseover = () => {
        if (!isUiExpanded) {
            toggleBtn.style.background = "#171b25";
            toggleBtn.style.color = "#8b8df5";
            toggleBtn.style.borderColor = "#46516a";
            toggleBtn.style.boxShadow = "0 6px 18px rgba(139, 141, 245, 0.25)";
            toggleBtn.style.height = "32px";
            toggleBtn.style.lineHeight = "30px";
        } else {
            toggleBtn.style.background = "#d9435f";
            toggleBtn.style.color = "#ffffff";
            toggleBtn.style.borderColor = "#d9435f";
            toggleBtn.style.boxShadow = "0 2px 10px rgba(217, 67, 95, 0.4)";
        }
    };

    toggleBtn.onmouseout = () => {
        if (!isUiExpanded) {
            toggleBtn.style.background = "#090b14";
            toggleBtn.style.color = "#c8cede";
            toggleBtn.style.borderColor = "#293043";
            toggleBtn.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.5)";
            toggleBtn.style.height = "28px";
            toggleBtn.style.lineHeight = "26px";
        } else {
            toggleBtn.style.background = "rgba(217, 67, 95, 0.15)";
            toggleBtn.style.color = "#ff7189";
            toggleBtn.style.borderColor = "rgba(255, 113, 137, 0.3)";
            toggleBtn.style.boxShadow = "0 1px 4px rgba(0, 0, 0, 0.2)";
        }
    };

    toggleBtn.onclick = () => {
        isUiExpanded = !isUiExpanded;
        if (isUiExpanded) {
            uiIframe.style.transform = "translateY(0)";
            toggleBtn.innerHTML = "CLOSE";
            toggleBtn.style.cssText = styles.buttonBase + styles.buttonExpanded;
        } else {
            uiIframe.style.transform = "translateY(-100%)";
            toggleBtn.innerHTML = "CHEATS";
            toggleBtn.style.cssText = styles.buttonBase + styles.buttonDefault;
        }
    };
    uiContainer.appendChild(uiIframe);
    uiContainer.appendChild(toggleBtn);
    document.body.appendChild(uiContainer);
}
