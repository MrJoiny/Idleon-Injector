/**
 * Core Globals Module
 *
 * Contains game engine references and initialization functions.
 * These are populated when the game is ready.
 */

/**
 * The Stencyl game engine reference.
 * @type {object|null}
 */
export let bEngine = null;

/**
 * Game attributes map from the game.
 * @type {object|null}
 */
export let gga = null;

/**
 * Item definitions from the game.
 * @type {object|null}
 */
export let itemDefs = null;

/**
 * Monster definitions from the game.
 * @type {object|null}
 */
export let monsterDefs = null;

/**
 * Custom lists from the game.
 * @type {object|null}
 */
export let cList = null;

/**
 * Stencyl behavior script object.
 * @type {object|null}
 */
export let behavior = null;

/**
 * Function to get actor event scripts by number.
 * @type {function|null}
 */
export let events = null;

/**
 * Custom maps from the game (atkMoveMap, etc).
 * @type {object|null}
 */
export let customMaps = null;

/**
 * Dialogue definitions for quests/NPCs.
 * @type {object|null}
 */
export let dialogueDefs = null;

/**
 * Stencyl Actor model.
 * @type {object|null}
 */
export let ActorModel = null;

/**
 * Firebase storage interface.
 * @type {object|null}
 */
export let firebase = null;

/**
 * Set of all item types discovered from item definitions.
 * @type {Set<string>}
 */
export const itemTypes = new Set();

/**
 * The game context (window/this reference).
 * Set during gameReady().
 * @type {object|null}
 */
export let gameContext = null;

/**
 * Wait for the game to be fully loaded and ready.
 * This polls until the Stencyl engine is initialized and cloud data is loaded.
 *
 * @param {object} context - The game window context (usually `this` from injection)
 * @returns {Promise<boolean>} Resolves to true when game is ready
 */
export async function gameReady(context) {
    while (
        !context["com.stencyl.Engine"] ||
        !context["com.stencyl.Engine"].hasOwnProperty("engine") ||
        !context["com.stencyl.Engine"].engine.hasOwnProperty("scene") ||
        !context["com.stencyl.Engine"].engine.sceneInitialized ||
        context["com.stencyl.Engine"].engine.behaviors.behaviors[0].script._CloudLoadComplete !== 1
    ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    registerCommonVariables(context);
    return true;
}

/**
 * Register common game variables and references.
 * Called after the game is ready to populate global references.
 *
 * @param {object} context - The game window context
 */
export function registerCommonVariables(context) {
    gameContext = context;
    bEngine = context["com.stencyl.Engine"].engine;
    gga = bEngine.gameAttributes.h;
    itemDefs = gga.ItemDefinitionsGET.h;
    monsterDefs = gga.MonsterDefinitionsGET.h;
    cList = gga.CustomLists.h;
    behavior = context["com.stencyl.behavior.Script"];
    events = (num) => context[`scripts.ActorEvents_${num}`];
    customMaps = context["scripts.CustomMaps"];
    dialogueDefs = context["scripts.DialogueDefinitions"];
    ActorModel = context["com.stencyl.models.Actor"];
    firebase = context.FirebaseStorage;

    // Populate itemTypes set
    itemTypes.clear();
    Object.values(itemDefs).forEach((entry) => {
        const type = entry.h.Type;
        if (type) itemTypes.add(type);
    });
}

/**
 * Get the current game context.
 * @returns {object|null}
 */
export function getGameContext() {
    return gameContext;
}

/**
 * Check if game globals are initialized.
 * @returns {boolean}
 */
export function isGameReady() {
    return bEngine !== null && itemDefs !== null;
}

// Individual accessor functions for backwards compatibility
export const getBEngine = () => bEngine;
export const getItemDefs = () => itemDefs;
export const getMonsterDefs = () => monsterDefs;
export const getCList = () => cList;
export const getBehavior = () => behavior;
export const getEvents = () => events;
export const getActorModel = () => ActorModel;
