import { behavior, cList, events, gga, itemDefs } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { settingsById } from "./engine.js";

/**
 * W2 alchemy bubbles. Decay bubbles approach a max, so they are raised to a % of it (L / (L + x2));
 * the others have no max and need a stop-at. Each step buys the switched-on bubble furthest from its goal.
 */

// The alchemy menu's behavior: its buy event, its owned-items cache and the selection fields the buy reads.
const alchemy = () => gga.PixelHelperActor[5].behaviors.getBehavior("ActorEvents_232");
const stats = (...args) => events(189)._customBlock_CauldronStats(...args);

// The cauldron titles the alchemy menu draws (POWER_CAULDRON, ...).
const CAULDRONS = ["POWER CAULDRON", "QUICC CAULDRON", "HIGH-IQ CAULDRON", "KAZAM CAULDRON"];
// Formulas of the form x1 * L / (L + x2), plus 1 for decayMulti.
const DECAY = ["decay", "decayMulti"];

// Cost slots that are currencies rather than items have no real item name.
// ponytail: plain labels where the game draws only an icon; W6item1-5 are FarmCrop entries 4, 30, 46, 72, 99.
const LIQUIDS = ["Water Droplets", "Liquid Nitrogen", "Trench Seawater", "Toxic Mercury"];
const ESSENCES = ["White", "Green", "Yellow", "Blue", "Purple"];
const W6_CROPS = [4, 30, 46, 72, 99];
const currencyName = (item) => {
    const [, kind, n] = /^(Liquid|W6item|W7item|SailTr|Spice|Meal)(\d+)$/.exec(item) ?? [];
    if (kind === "Liquid") return LIQUIDS[n - 1];
    if (kind === "W6item")
        return n === "0" ? "Jade Coins" : n > 5 ? `${ESSENCES[n - 6]} Essence` : `Crop ${W6_CROPS[n - 1]}`;
    if (kind === "W7item") return `Spelunking item ${n}`;
    if (kind === "SailTr") return `Sailing treasure ${n}`;
    if (kind === "Spice") return `Spice ${n}`;
    if (kind === "Meal") return cList.MealINFO[n][0];
    return itemDefs[item].h.displayName;
};

/**
 * Run fn with the menu set to its Bubbles tab, then put the menu's fields back.
 * _GenINFO[17] keeps the menu's last tab after it closes, and at 1 (liquid shop) CauldronCosts returns
 * liquid-shop prices, also inside the buy event. _GenINFO[39], _TRIGGERtext2 and _ParticleAfford are
 * the menu's selected bubble, buy mode and particle flag, which a buy overwrites.
 */
function onBubblesTab(fn) {
    const menu = alchemy();
    const saved = [menu._GenINFO[17], menu._GenINFO[39], menu._TRIGGERtext2, menu._ParticleAfford];
    menu._GenINFO[17] = 0;
    try {
        return fn(menu);
    } finally {
        [menu._GenINFO[17], menu._GenINFO[39], menu._TRIGGERtext2, menu._ParticleAfford] = saved;
    }
}

// The menu's own owned-items map (inventory + chest, liquids, salts, Bits, W6/W7 currencies), rebuilt the way a buy does.
const ownedItems = (menu) => {
    menu._TRIGGERtext = "z";
    menu._customEvent_PostOfficeIMG();
    return menu._ItemsAndStorageOWNED.h;
};

/** The bubble panel's description at the current level, with the panel's rounding and per-bubble totals ($). */
function bonusText(menu, cauldron, bubble, row) {
    const value = stats("BubbleBonus", cauldron, bubble, 0);
    const decay = DECAY.includes(row[3]);
    let shown = Math.round(value);
    if (value < 10 && decay) shown = Math.round(100 * value) / 100;
    else if (value < 1 || (row[3] === "add" && Number(row[2]) < 1 && value < 100) || (value < 25 && decay))
        shown = Math.round(10 * value) / 10;
    const text = String(row[9]);
    const total = (scale) =>
        text
            .split("$")
            .join(
                events(266)._customBlock_FormatBonuses(shown * scale, String(row[3]), Number(row[1]), Number(row[2]))
            );
    const tools = (kinds) => text.split("{").join(String(shown)).split("$").join(kinds);
    const ae12 = events(12);
    const ae124 = events(124);
    const key = `${cauldron}:${bubble}`;
    if (key === "0:5") return total(ae124._customBlock_getLOG(Math.max(ae12._customBlock_PlayerHPmax() - 250, 1)));
    if (key === "1:5")
        return total(ae124._customBlock_Log2(Math.max(ae12._customBlock_PlayerSpeedBonus() - 0.1, 0)) / 0.25);
    if (key === "2:5") return total(ae124._customBlock_getLOG(Math.max(ae12._customBlock_PlayerMPmax() - 150, 1)));
    if (key === "3:7") return total(Math.max(Math.pow(menu._GenINFO[87] / 25, 0.3), 0));
    if (key === "0:7") return tools("Pickaxes_and_Fishing_Rods.");
    if (key === "1:6") return tools("Catching_Nets_and_Traps.");
    if (key === "2:6") return tools("Hatchets_and_Worship_Skulls.");
    const y6 = key === "3:25" ? ae124._customBlock_NotateNumber(Number(gga.DNSM.h.AlchBubbles.h.Y6), "Big") + "%" : "$";
    return text.split("$").join(y6).split("{").join(String(shown));
}

/**
 * One bubble's level, % of max, next cost per slot and particle option. The menu offers a particle buy when
 * the atom collider is on, the first cost slot is 1e8 or more and not Bits or a W6 currency; it pays only the
 * liquid slots, plus particles and one charge.
 */
function readBubble(menu, owned, cauldron, bubble) {
    const row = cList.AlchemyDescription[cauldron][bubble];
    const level = Number(gga.CauldronInfo[cauldron][bubble]);
    const costs = [5, 6, 7, 8].flatMap((field, slot) => {
        const item = String(row[field]);
        if (item === "Blank") return [];
        return [{ item, cost: stats("CauldronCosts", cauldron, bubble, slot), owned: Number(owned[item]) || 0 }];
    });
    const liquids = costs.filter(({ item }) => item.startsWith("Liquid"));
    const first = String(row[5]);
    const firstCost = stats("CauldronCosts", cauldron, bubble, 0);
    let particle;
    if (!(gga.Atoms[4] > 0.5)) particle = { waiting: "Particles wait for the Atom Collider" };
    else if (first === "Bits" || first.startsWith("W6item")) particle = { waiting: "This bubble can't use particles" };
    else if (!(firstCost >= 1e8)) particle = { waiting: "Particles open once the first cost reaches 100M" };
    else {
        const cost = events(579)._customBlock_AtomCollider("AtomBubbleUpgCost", bubble, firstCost);
        let waiting = null;
        if (!(gga.OptionsListAccount[135] > 0)) waiting = "Particles wait for an upgrade charge";
        else if (!(gga.Divinity[39] >= cost)) waiting = "Not enough particles";
        else if (liquids.some((slot) => slot.owned < slot.cost)) waiting = "Not enough liquid for a particle buy";
        particle = { cost, liquids, waiting };
    }
    return {
        id: `${cauldron}:${bubble}`,
        name: String(row[0]),
        level,
        // null for bubbles without a max.
        percent: DECAY.includes(row[3]) ? (100 * level) / (level + Number(row[2])) : null,
        costs,
        particle,
    };
}

const bubbleRows = (cauldron) =>
    cList.AlchemyDescription[cauldron].flatMap((row, bubble) => (row[0] === "BUBBLE" ? [] : [bubble]));

/** Why buying waits right now; null when it may buy. */
function waiting() {
    if (gga.MenuType2 === 21) return "Paused while the alchemy menu is open";
    // Any bubble buy uses up every Bargain Tag, so they are left for a bubble you pick.
    if (gga.OptionsListAccount[62] > 0) return "Paused while you hold Bargain Tags";
    return null;
}

/** Bubbles per cauldron with their bonus text, level, % of max, costs and particle option, for the Automation tab. */
export function getAutomationBubbles() {
    return onBubblesTab((menu) => {
        const owned = ownedItems(menu);
        return {
            waiting: waiting(),
            atoms: gga.Atoms[4] > 0.5,
            particles: gga.Divinity[39],
            charges: gga.OptionsListAccount[135],
            cauldrons: CAULDRONS.map((name, cauldron) => ({
                name,
                bubbles: bubbleRows(cauldron).map((bubble) => {
                    const data = readBubble(menu, owned, cauldron, bubble);
                    return {
                        ...data,
                        bonus: bonusText(menu, cauldron, bubble, cList.AlchemyDescription[cauldron][bubble]),
                        costs: data.costs.map(({ item, cost, owned: have }) => ({
                            name: currencyName(item),
                            cost,
                            short: have < cost,
                            liquid: item.startsWith("Liquid"),
                        })),
                        particle: { cost: data.particle.cost ?? null, waiting: data.particle.waiting },
                    };
                }),
            })),
        };
    });
}

/**
 * How far a switched-on bubble is towards its goal, 1 meaning done: % of max over the target for decay
 * bubbles, level over stop-at for the others, the further along of both when a decay bubble also has a stop-at.
 * null when it can't have a goal (no max and no stop-at).
 */
function progress({ percent, level }, target, stopAt) {
    const byLevel = stopAt === undefined || stopAt === null ? null : stopAt > 0 ? level / stopAt : 1;
    if (percent === null) return byLevel;
    const byPercent = percent / target;
    return byLevel === null ? byPercent : Math.max(byPercent, byLevel);
}

// The "+n" level popup the buy event spawns at the panel's spot even with the menu closed.
function buyWithoutPopup(menu) {
    const create = behavior.createRecycledActor;
    const spawned = [];
    behavior.createRecycledActor = function (...args) {
        const actor = Reflect.apply(create, this, args);
        spawned.push(actor);
        return actor;
    };
    try {
        menu._customEvent_BubbleHoldDown();
    } finally {
        behavior.createRecycledActor = create;
        spawned.forEach((actor) => behavior.recycleActor(actor));
    }
}

/**
 * The menu's buy event, called with the menu closed. It skips its affordability check then (that check only
 * covers cost icons on screen) and would take currencies below 0, so every slot is checked here first.
 * The pick is the lowest progress among affordable bubbles; a Particles row only buys with particles.
 */
function buyOne(target, settings) {
    return onBubblesTab((menu) => {
        const owned = ownedItems(menu);
        let pick = null;
        for (const cauldron of [0, 1, 2, 3]) {
            for (const bubble of bubbleRows(cauldron)) {
                const entry = settings.get(`${cauldron}:${bubble}`);
                if (!entry?.on || !(gga.CauldronInfo[cauldron][bubble] > 0)) continue;
                const data = readBubble(menu, owned, cauldron, bubble);
                const done = progress(data, target, entry.stopAt);
                if (done === null || done >= 1 || (pick && pick.done <= done)) continue;
                const particles = entry.pay === "particles";
                const affordable = particles
                    ? data.particle.liquids && !data.particle.waiting
                    : data.costs.every(({ cost, owned: have }) => have >= cost);
                if (affordable) pick = { cauldron, bubble, particles, done };
            }
        }
        if (!pick) return false;
        menu._GenINFO[39] = [pick.cauldron, pick.bubble];
        menu._TRIGGERtext2 = pick.particles ? "bubbleParticle" : "bubbleNormal";
        // The event wants the particle flag the open panel computes; the checks above stand in for it.
        menu._ParticleAfford = 1;
        buyWithoutPopup(menu);
        return true;
    });
}

export function runBubbles() {
    const { target, items } = cheatConfig.automation.bubbles;
    if (!items.some((entry) => entry.on) || waiting()) return;
    const settings = settingsById(items);
    // ponytail: cap per tick so a buy the game ignores can't spin forever; leftovers wait for the next tick.
    for (let i = 0; i < 100 && buyOne(target, settings); i++);
}
