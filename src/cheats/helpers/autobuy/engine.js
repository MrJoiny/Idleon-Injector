/**
 * Shared buying rule for every Autobuy group.
 *
 * A group hands in the items that may be bought right now (switched on, unlocked, below their stop-at),
 * each as { cost, priority, buy }. Priority 0 is Balanced; 1-3 are priority groups.
 */

const cheapest = (items) => items.reduce((best, item) => (!best || item.cost < best.cost ? item : best), null);

/**
 * The highest priority group with an item names the target (its cheapest item), bought once affordable.
 * While saving for it, only Balanced items costing at most `saving`% of the target may buy;
 * lower priority groups wait so a cheap reset can't wipe the run being saved in.
 * Without a target it is plain cheapest-first.
 */
export function choosePurchase(items, money, saving) {
    for (const priority of [1, 2, 3]) {
        const target = cheapest(items.filter((item) => item.priority === priority));
        if (!target) continue;
        if (target.cost <= money) return target;
        const limit = Math.min(money, (target.cost * saving) / 100);
        return cheapest(items.filter((item) => !item.priority && item.cost <= limit));
    }
    return cheapest(items.filter((item) => item.cost <= money));
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
