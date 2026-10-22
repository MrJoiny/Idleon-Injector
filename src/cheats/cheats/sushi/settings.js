import { cheatConfig } from "../../core/state.js";
import { sushiTools } from "./station.js";

export function readSushiSettings() {
    const settings = { ...cheatConfig.w7.sushitools };
    const { tier, targetCount, targetTier, reserveSlots, extendChain, higherTier } = settings;
    const { maxTier, maxPurchaseTier } = sushiTools("settings");
    if (
        !Number.isInteger(reserveSlots) ||
        reserveSlots < 0 ||
        reserveSlots >= 120 ||
        !Number.isInteger(targetTier) ||
        targetTier < 1 ||
        targetTier > maxTier + 1
    )
        throw new Error("Choose a valid target tier and 0–119 reserved slots.");
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 120)
        throw new Error("Target quantity must fit the usable board slots.");
    if (typeof extendChain !== "boolean" || typeof higherTier !== "boolean")
        throw new Error("East Wind overrides must be boolean values.");
    if (!Number.isInteger(tier) || tier < 1 || tier > maxPurchaseTier)
        throw new Error("Choose an unlocked whole-number tier.");
    return settings;
}
