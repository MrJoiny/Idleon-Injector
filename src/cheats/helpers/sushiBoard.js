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

export function boardLimits(board, plates, maxTier = 63) {
    validateBoard(board, plates);
    if (!Number.isInteger(maxTier) || maxTier < 1 || board.some((tier) => tier > maxTier))
        throw new Error("Unexpected maximum Sushi tier.");
    const unlocked = plates.map((plate, index) => (plate >= 0 ? index : -1)).filter((index) => index >= 0);
    const reserved = unlocked.slice(-2);
    const working = unlocked.slice(0, -2);
    if (board.filter((tier) => tier >= 0).length > working.length)
        throw new Error("Clear two slots before starting; no sushi will be deleted.");
    return { reserved, working, maxTier, capped: board.filter((tier) => tier === maxTier).length };
}

export function findPairMove(board, plates, maxTier = 63) {
    const { working } = boardLimits(board, plates, maxTier);
    const first = new Map();
    for (const index of working) {
        const tier = board[index];
        if (tier < 0 || tier >= maxTier) continue;
        if (first.has(tier)) return { source: first.get(tier), target: index, kind: "pair" };
        first.set(tier, index);
    }
    return null;
}

export function sortBoard(board, plates, maxTier = 63) {
    boardLimits(board, plates, maxTier);
    const values = board.filter((_, index) => plates[index] >= 0).sort((a, b) => b - a);
    let next = 0;
    return board.map((tier, index) => (plates[index] >= 0 ? values[next++] : tier));
}

export function findStartMove(board, plates, maxTier = 63) {
    validateBoard(board, plates);
    const { working } = boardLimits(board, plates, maxTier);
    for (let index = 1; index < board.length - 1; index++) {
        if (
            working.includes(index + 1) &&
            board[index] < maxTier &&
            board[index] >= 0 &&
            board[index - 1] === board[index] + 1 &&
            board[index + 1] === board[index]
        ) {
            return { source: index, target: index + 1, kind: "start" };
        }
    }
    return null;
}

/** Follow the active gap, never a different pair elsewhere on the board. */
export function findContinuationMove(board, plates, landing, maxTier = 63) {
    validateBoard(board, plates);
    if (!Number.isInteger(landing) || landing < 1 || landing >= board.length - 1) return null;
    const { working } = boardLimits(board, plates, maxTier);
    if (!working.includes(landing + 1)) return null;
    const tier = board[landing];
    if (tier < 0 || tier >= maxTier || board[landing + 1] !== tier || board[landing - 1] !== -1) return null;
    let left = landing - 1;
    while (left >= 0 && board[left] === -1) {
        if (plates[left] < 0) return null;
        left--;
    }
    if (left >= 0 && board[left] === tier) return { source: left, target: landing, kind: "gap" };
    return { source: landing, target: landing + 1, kind: "final" };
}

/** Prefer a matching gap; otherwise finish an interrupted chain's adjacent tail. */
export function findResumeMove(board, plates, maxTier = 63) {
    validateBoard(board, plates);
    let finalPair = null;
    for (let landing = 1; landing < board.length - 1; landing++) {
        const move = findContinuationMove(board, plates, landing, maxTier);
        if (move?.kind === "gap") return move;
        if (move?.kind === "final" && !finalPair) finalPair = move;
    }
    return finalPair;
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
