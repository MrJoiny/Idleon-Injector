import { gga, events } from "../core/globals.js";

/** Aggregate a binary crafting tree; no board, fuel or discovery changes. */
export function simulateSushiKnowledge(tier, quantity) {
    const rules = events(579);
    const maximum = Number(rules._customBlock_SushiStuff("MaxTier", 0, 0)) + 1;
    if (!Number.isInteger(tier) || tier < 1 || tier > maximum || !Number.isSafeInteger(quantity) || quantity < 1)
        throw new Error("Choose a valid tier and a positive whole-number quantity.");
    if (rules._customBlock_SushiStuff("KnowledgeLVunlocked", 0, 0) !== 1)
        throw new Error("Unlock Sushi Knowledge before adding XP.");
    // Exclude actual column placement, then apply the native pink fireplace bonus once.
    const perCreation =
        Number(rules._customBlock_SushiStuff("KnowledgeXP_base", 0, 0)) *
        Number(rules._customBlock_SushiStuff("KnowledgeXP_multi", -1, 0)) *
        (1 + Number(rules._customBlock_SushiStuff("FireplaceEffect", 3, 0)) / 100);
    const xp = gga.Sushi[6];
    if (!Array.isArray(xp) || xp.length < tier || !Number.isFinite(perCreation) || perCreation <= 0)
        throw new Error("Knowledge XP data is unavailable.");
    const changes = Array.from({ length: tier }, (_, index) => {
        const old = Number(xp[index]);
        const next = old + quantity * Math.pow(2, tier - index - 1) * perCreation;
        if (!Number.isFinite(old) || old < 0 || !Number.isFinite(next) || next <= old)
            throw new Error("Knowledge XP exceeds the supported numeric range.");
        return next;
    });
    changes.forEach((value, index) => {
        xp[index] = value;
    });
    return "Added crafting-tree Knowledge XP for " + quantity + " x tier " + tier + ". Board unchanged.";
}
