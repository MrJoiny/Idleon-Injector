// Numbered stones sold by W1-W7 town shops; SK/event stones are not town progression.
export const townStones = [
    { weapon: "StoneW1", armor: "StoneA1", tool: "StoneT1" },
    { weapon: "StoneW2", armor: "StoneA2", tool: "StoneT2" },
    { weapon: "StoneW3", armor: "StoneA3", tool: "StoneT3" },
    { weapon: "StoneW4", armor: "StoneA4", tool: "StoneT4" },
    { weapon: "StoneW5", armor: "StoneA5", tool: "StoneT5" },
    { weapon: "StoneW8", armor: "StoneA7", tool: "StoneT7" },
    { weapon: "StoneW9", armor: "StoneA8", tool: "StoneT8" },
];
export function equipmentWorld(attributes) {
    let world = 1;
    // Native world menu checks the preceding town's first portal (W7 checks town250).
    for (let town = 0; town <= 250; town += 50) {
        const gate = attributes.KillsLeft2Advance?.[town]?.[0];
        if (gate === undefined || gate === null || !Number.isFinite(Number(gate)))
            throw new Error("Town progression is unavailable. Nothing changed.");
        if (Number(gate) > 0) break;
        world++;
    }
    return world;
}
export function equipmentStones(world) {
    if (!Number.isInteger(world) || world < 1 || world > 7) throw new Error("Invalid equipment stone world.");
    return townStones[world - 1];
}
