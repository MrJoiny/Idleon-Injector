/**
 * Game Attributes Proxies
 *
 * Proxies for core game attributes:
 * - Gems (freeze gems)
 * - HP (infinite health)
 * - Currencies (teleports, tickets, obol fragments, silver pens)
 * - Cloud save (pause cloud saving)
 * - Values map (free revives)
 * - Options list account (unban, event items, minigames, quick ref, etc.)
 */

import { cheatState } from "../core/state.js";
import { bEngine } from "../core/globals.js";
import { createProxy } from "../utils/createProxy.js";
import { createToggleProxy } from "../utils/proxyHelpers.js";
import { getConfig, setConfig } from "./proxyContext.js";

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    setConfig(config);
}

/**
 * Setup proxy to freeze gems (prevent changes when enabled).
 */
export function setupGemsProxy() {
    createProxy(bEngine.gameAttributes.h, "GemsOwned", {
        get: function (original) {
            return original;
        },
        set: function (value, backupKey) {
            if (cheatState.wide.gems) return;
            this[backupKey] = value;
        },
    });
}

/**
 * Setup proxy for HP to always return max HP when enabled.
 * @param {object} events - The events function from globals
 */
export function setupHPProxy(events) {
    Object.defineProperty(bEngine.gameAttributes.h, "PlayerHP", {
        get: function () {
            return this._PlayerHP;
        },
        set: function (value) {
            return (this._PlayerHP = cheatState.godlike.hp ? events(12)._customBlock_PlayerHPmax() : value);
        },
    });
}

/**
 * Setup proxy for currencies (teleports, tickets, obol fragments, silver pens).
 */
export function setupCurrenciesOwnedProxy() {
    const currencies = bEngine.getGameAttribute("CurrenciesOwned").h;
    const handler = {
        get: function (obj, prop) {
            if (cheatState.unlock.teleports && prop === "WorldTeleports") return obj.WorldTeleports || 1;
            if (cheatState.unlock.tickets && prop === "ColosseumTickets") return obj.ColosseumTickets || 1;
            if (cheatState.unlock.obolfrag && prop === "ObolFragments") return obj.ObolFragments || 9001; // It's over nine thousand
            if (cheatState.unlock.silvpen && prop === "SilverPens") return obj.SilverPens || 1;
            return obj[prop];
        },
        set: function (obj, prop, value) {
            if (cheatState.unlock.teleports && prop === "WorldTeleports") return true; // Do nothing
            if (cheatState.unlock.tickets && prop === "ColosseumTickets") {
                if (obj.ColosseumTickets < value) obj.ColosseumTickets = value;
                return true;
            }
            if (cheatState.unlock.silvpen && prop === "SilverPens") {
                if (obj.SilverPens < value) obj.SilverPens = value;
                return true;
            }
            if (cheatState.unlock.obolfrag && prop === "ObolFragments") {
                if (obj.ObolFragments < value) obj.ObolFragments = value;
                return true;
            }
            return (obj[prop] = value);
        },
    };
    const proxy = new Proxy(currencies, handler);
    bEngine.getGameAttribute("CurrenciesOwned").h = proxy;
}

/**
 * Setup proxy for cloud save cooldown (pause cloud saving).
 */
export function setupCloudSaveProxy() {
    const CloudSave = bEngine.getGameAttribute("CloudSaveCD");
    const handler = {
        get: function (obj, prop) {
            if (cheatState.cloudz && Number(prop) === 0) return 235;
            return Reflect.get(...arguments);
        },
        set: function (obj, prop, value) {
            if (cheatState.cloudz && Number(prop) === 0) {
                obj[0] = 235;
                return true;
            }
            return Reflect.set(...arguments);
        },
    };
    const proxy = new Proxy(CloudSave, handler);
    bEngine.setGameAttribute("CloudSaveCD", proxy);
}

/**
 * Setup proxy for personal values map (free revives).
 */
export function setupValuesMapProxy() {
    const personalValuesMap = bEngine.getGameAttribute("PersonalValuesMap").h;

    personalValuesMap._InstaRevives = personalValuesMap.InstaRevives;
    Object.defineProperty(personalValuesMap, "InstaRevives", {
        get: function () {
            if (cheatState.unlock.revive) return 10;
            return this._InstaRevives;
        },
        set: function (value) {
            if (cheatState.unlock.revive) return true;
            this._InstaRevives = value;
            return true;
        },
        enumerable: true,
    });
}

// ============================================================================
// Options List Account Proxy - Data-Driven Configuration
// ============================================================================

/**
 * Creates a max cap proxy handler that limits values to a configured maximum.
 * @param {string} configKey - Key in cheatConfig.maxval
 * @returns {{get: function, set: function}} Proxy handlers
 */
function createMaxCapProxy(configKey) {
    return {
        get: function (original) {
            return original;
        },
        set: function (value, backupKey) {
            const cheatConfig = getConfig();
            if (isNaN(value)) {
                this[backupKey] = cheatConfig?.maxval?.[configKey] ?? value;
                return;
            }
            value = Math.min(cheatConfig?.maxval?.[configKey] ?? Infinity, value);
            this[backupKey] = value;
        },
    };
}

/**
 * Creates a simple max cap proxy without NaN handling.
 * @param {string} configKey - Key in cheatConfig.maxval
 * @returns {{get: function, set: function}} Proxy handlers
 */
function createSimpleMaxCapProxy(configKey) {
    return {
        get: function (original) {
            return original;
        },
        set: function (value, backupKey) {
            const cheatConfig = getConfig();
            value = Math.min(cheatConfig?.maxval?.[configKey] ?? Infinity, value);
            this[backupKey] = value;
        },
    };
}

/**
 * Setup proxy for options list account (many toggles and caps).
 */
export function setupOptionsListAccountProxy() {
    const optionsListAccount = bEngine.gameAttributes.h.OptionsListAccount;
    const cheatConfig = getConfig();

    if (optionsListAccount._isPatched) return;
    Object.defineProperty(optionsListAccount, "_isPatched", { value: true, enumerable: false });

    // Toggle-based proxies (state check -> return fixed value)
    const toggleProxies = [
        { index: 26, stateGetter: () => cheatState.unban, value: 0 },
        { index: 29, stateGetter: () => cheatState.wide.eventitems, value: 0 },
        { index: 33, stateGetter: () => cheatState.minigames, value: 1 },
        { index: 34, stateGetter: () => cheatState.unlock.quickref, value: 0 },
        { index: 100, stateGetter: () => cheatState.w4.spiceclaim, value: 0 },
        { index: 325, stateGetter: () => cheatState.wide.eventspins, value: 10 },
        { index: 370, stateGetter: () => cheatState.w6.emperor, value: -10 },
        { index: 414, stateGetter: () => cheatState.w3.jeweledcogs, value: 0 },
    ];

    toggleProxies.forEach(({ index, stateGetter, value }) => {
        createProxy(
            optionsListAccount,
            index,
            createToggleProxy(stateGetter, () => value)
        );
    });

    // Config-based toggle (state + config value)
    createProxy(optionsListAccount, 169, {
        get: function (original) {
            if (cheatState.unlock.islands) return cheatConfig?.unlock?.islands ?? original;
            return original;
        },
        set: function (value, backupKey) {
            if (cheatState.unlock.islands) return;
            this[backupKey] = value;
        },
    });

    // Boss attempts (special logic - reset when at max)
    createProxy(optionsListAccount, 185, {
        get: function (original) {
            if (cheatState.w2.boss && original == 10) original = 0;
            return original;
        },
        set: function (value, backupKey) {
            this[backupKey] = value;
        },
    });

    // Simple max cap proxies (no NaN handling)
    const simpleMaxCapProxies = [
        { index: 71, configKey: "creditcap" },
        { index: 72, configKey: "creditcap" },
        { index: 73, configKey: "flurbocap" },
    ];

    simpleMaxCapProxies.forEach(({ index, configKey }) => {
        createProxy(optionsListAccount, index, createSimpleMaxCapProxy(configKey));
    });

    // Max cap proxies with NaN handling (bones, dust, tach)
    const maxCapWithNaN = [
        { index: 329, configKey: "totalbones" },
        { index: 362, configKey: "totaldust" },
        { index: 394, configKey: "totaltach" },
    ];

    maxCapWithNaN.forEach(({ index, configKey }) => {
        createProxy(optionsListAccount, index, createMaxCapProxy(configKey));
    });

    // Array-based max cap proxies
    const arrayMaxCapProxies = [
        { indices: [330, 331, 332, 333], configKey: "bones" },
        { indices: [357, 358, 359, 360, 361], configKey: "dust" },
        { indices: [388, 389, 390, 391, 392, 393], configKey: "tach" },
    ];

    arrayMaxCapProxies.forEach(({ indices, configKey }) => {
        indices.forEach((index) => {
            createProxy(optionsListAccount, index, createMaxCapProxy(configKey));
        });
    });
}

/**
 * Setup proxy for monster respawn time.
 */
export function setupMonsterRespawnProxy() {
    const cheatConfig = getConfig();
    const monsterRespawnTime = bEngine.gameAttributes.h.MonsterRespawnTime;

    if (monsterRespawnTime._isPatched) return;
    Object.defineProperty(monsterRespawnTime, "_isPatched", { value: true, enumerable: false });

    const respawnHandler = {
        set(target, prop, value) {
            const newValue = cheatState.godlike.respawn ? cheatConfig?.godlike?.respawn?.(value) ?? value : value;
            target[prop] = newValue;
            return true;
        },
    };

    bEngine.gameAttributes.h.MonsterRespawnTime = new Proxy(monsterRespawnTime, respawnHandler);
}

/**
 * Setup all game attribute proxies.
 * @param {object} events - The events function from globals
 * @param {object} config - The cheat config object
 */
export function setupGameAttributeProxies(events, config) {
    setCheatConfig(config);
    setupGemsProxy();
    setupHPProxy(events);
    setupCurrenciesOwnedProxy();
    setupCloudSaveProxy();
    setupValuesMapProxy();
    setupOptionsListAccountProxy();
    setupMonsterRespawnProxy();
}
