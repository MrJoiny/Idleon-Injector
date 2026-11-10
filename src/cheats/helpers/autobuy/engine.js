/**
 * Shared buying rule for every Autobuy group.
 *
 * A group hands in the items that may be bought right now (switched on, unlocked, below their stop-at),
 * each as { cost, priority, buy }. Priority 1 is High, 2 is Low, anything else Balanced.
 */

const HIGH = 1;
const LOW = 2;

const cheapest = (items) => items.reduce((best, item) => (!best || item.cost < best.cost ? item : best), null);

/** What the group is saving for: the cheapest High or Low item. */
export const nextGoal = (items) => cheapest(items.filter((item) => item.priority === HIGH || item.priority === LOW));

/**
 * An affordable High item goes first. Otherwise the cheapest High or Low item is the goal, bought once
 * affordable; while saving for it, Balanced items may only buy things costing at most `saving`% of it.
 * Without a goal it is plain cheapest-first.
 */
export function choosePurchase(items, money, saving) {
    const high = cheapest(items.filter((item) => item.priority === HIGH && item.cost <= money));
    if (high) return high;

    const goal = nextGoal(items);
    if (goal && goal.cost <= money) return goal;

    const limit = goal ? Math.min(money, (goal.cost * saving) / 100) : money;
    return cheapest(items.filter((item) => item.priority !== HIGH && item.priority !== LOW && item.cost <= limit));
}

/** Buy until nothing qualifies, re-reading after every buy because one can change everything (resets). */
export function buyCheapestFirst(readItems, readMoney, saving = 0) {
    // ponytail: cap per tick so a buy the game ignores can't spin forever; leftovers wait for the next tick.
    for (let i = 0; i < 100; i++) {
        const pick = choosePurchase(readItems(), readMoney(), saving);
        if (!pick) return;
        pick.buy();
    }
}

/** Saved per-item settings ({ id, on, stopAt, priority }) keyed by id. */
export const settingsById = (entries) => new Map(entries.map((entry) => [String(entry.id), entry]));
