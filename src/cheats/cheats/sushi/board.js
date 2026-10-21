/** Sushi tiers are zero-based; -1 is empty. Plate positions never move. */
export function validateBoard(board, plates) {
    if (!Array.isArray(board) || !Array.isArray(plates) || board.length !== 120 || plates.length !== 120) {
        throw new Error("Expected a 15 by 8 Sushi board.");
    }
    board.forEach((tier, index) => {
        if (!Number.isInteger(tier) || tier < -1 || !Number.isInteger(plates[index]) || plates[index] < -1) {
            throw new Error("Unexpected Sushi board values.");
        }
        if (plates[index] === -1 && tier !== -1) throw new Error("Sushi found on a locked slot; sort cancelled.");
    });
}

export function boardLimits(board, plates, maxTier = 63, options = {}) {
    validateBoard(board, plates);
    if (!Number.isInteger(maxTier) || maxTier < 1 || board.some((tier) => tier > maxTier))
        throw new Error("Unexpected maximum Sushi tier.");
    const unlocked = plates.map((plate, index) => (plate >= 0 ? index : -1)).filter((index) => index >= 0);
    const reserveSlots = options.reserveSlots ?? 2;
    const targetTier = options.targetTier === undefined ? maxTier : options.targetTier - 1;
    if (
        !Number.isInteger(reserveSlots) ||
        reserveSlots < 0 ||
        reserveSlots > unlocked.length ||
        !Number.isInteger(targetTier) ||
        targetTier < 0 ||
        targetTier > maxTier
    )
        throw new Error("Invalid target tier or reserved slot count.");
    const reserved = reserveSlots ? unlocked.slice(-reserveSlots) : [];
    const working = unlocked.slice(0, unlocked.length - reserveSlots);
    return {
        reserved,
        working,
        maxTier,
        targetTier,
        reserveSlots,
        capped: board.filter((tier) => tier >= targetTier).length,
    };
}

export function findPairMove(board, plates, maxTier = 63, options = {}) {
    const { working, targetTier } = boardLimits(board, plates, maxTier, options);
    const first = new Map();
    for (const index of working) {
        const tier = board[index];
        if (tier < 0 || tier >= targetTier) continue;
        if (first.has(tier)) return { source: first.get(tier), target: index, kind: "pair" };
        first.set(tier, index);
    }
    return null;
}

export function sortBoard(board, plates, maxTier = 63) {
    boardLimits(board, plates, maxTier, { reserveSlots: 0 });
    const values = board.filter((_, index) => plates[index] >= 0).sort((a, b) => b - a);
    let next = 0;
    return board.map((tier, index) => (plates[index] >= 0 ? values[next++] : tier));
}

/** Ignore empty cells within an unlocked run, but never cross a locked plate. */
function occupiedRuns(board, plates, working) {
    const runs = [[]];
    for (let i = 0; i < board.length; i++) {
        if (!working.includes(i) || plates[i] < 0) {
            if (runs[runs.length - 1].length) runs.push([]);
        } else if (board[i] >= 0) runs[runs.length - 1].push(i);
    }
    return runs;
}
export function findStartMove(board, plates, maxTier = 63, options = {}) {
    const { working, targetTier } = boardLimits(board, plates, maxTier, options);
    for (const run of occupiedRuns(board, plates, working)) {
        for (let i = 0; i + 2 < run.length; i++) {
            const [a, b, c] = run.slice(i, i + 3);
            if (board[b] >= targetTier || board[b] !== board[c]) continue;
            if (board[a] === board[b] + 1) return { source: b, target: c, kind: "start" };
            if (board[a] === board[b]) return { source: a, target: b, kind: "triple" };
        }
    }
    return null;
}
export function findContinuationMove(board, plates, landing, maxTier = 63, options = {}) {
    const { working, targetTier } = boardLimits(board, plates, maxTier, options);
    for (const run of occupiedRuns(board, plates, working)) {
        const at = run.indexOf(landing);
        if (at < 0 || board[landing] >= targetTier) continue;
        const left = run[at - 1],
            right = run[at + 1];
        if (
            left !== undefined &&
            right !== undefined &&
            board[left] === board[landing] &&
            board[right] === board[landing]
        )
            return { source: left, target: landing, kind: "gap" };
        if (
            right !== undefined &&
            board[right] === board[landing] &&
            ((landing > 0 && plates[landing - 1] >= 0 && board[landing - 1] === -1) || right > landing + 1)
        )
            return { source: landing, target: right, kind: "final" };
    }
    return null;
}
export function findResumeMove(board, plates, maxTier = 63, options = {}) {
    const start = findStartMove(board, plates, maxTier, options);
    let first = start;
    for (let landing = 0; landing < board.length; landing++) {
        const move = findContinuationMove(board, plates, landing, maxTier, options);
        if (move && (!first || move.source < first.source)) first = move;
    }
    return first;
}

/** Advisory only: budget 85% of generated fuel for a full refill of non-capped slots. */
export function fuelTierSuggestions(perSecond, costs, slots) {
    if (
        !Number.isFinite(perSecond) ||
        perSecond < 0 ||
        !Number.isInteger(slots) ||
        slots <= 0 ||
        !Array.isArray(costs) ||
        !costs.length ||
        costs.some((cost) => !Number.isFinite(cost) || cost <= 0)
    )
        return [];
    return [120, 180, 300].map((seconds) => {
        const budget = perSecond * seconds * 0.85;
        let tier = null;
        costs.forEach((cost, index) => {
            if (cost * slots <= budget) tier = index + 1;
        });
        return { seconds, tier };
    });
}
