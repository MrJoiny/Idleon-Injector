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

export function sortBoard(board, plates, maxTier = 63) {
    boardLimits(board, plates, maxTier, { reserveSlots: 0 });
    const values = board.filter((_, index) => plates[index] >= 0).sort((a, b) => b - a);
    let next = 0;
    return board.map((tier, index) => (plates[index] >= 0 ? values[next++] : tier));
}

/** Prefer immediate free upgrades, then higher merge tiers. This is a greedy score. */
export function findMergeMove(board, plates, maxTier, options, effects) {
    const { working, targetTier } = boardLimits(board, plates, maxTier, options);
    const usable = new Set(working);
    const counts = Array(maxTier + 1).fill(0);
    for (const index of working) if (board[index] >= 0) counts[board[index]]++;
    const { wind, limit, chainLimit, blueChance, fireplaces, discovered } = effects;
    let best = null;
    for (let tier = 0; tier < targetTier; tier++) {
        if (counts[tier] < 2) continue;
        const lower = [];
        for (let t = tier; t >= 0; t--) {
            if (counts[t] - (t === tier ? 2 : 0) > 0) lower.push(t);
        }
        for (const target of working) {
            const bonus =
                fireplaces[target % 15] === 2 && discovered[tier + 1] !== -1 && tier + 1 < maxTier ? blueChance : 0;
            const chainChance = wind && tier + 1 < limit ? (tier + 2 < limit ? 1 : 1 - bonus) : 0;
            const tail = [];
            if (chainChance > 0) {
                for (let j = 0; j < Math.min(chainLimit, lower.length); j++) {
                    if (!usable.has(target + j + 1)) break;
                    tail.push(lower[j]);
                }
            }
            let tailBonus = 0;
            for (let j = 0; j < tail.length; j++) {
                if (fireplaces[(target + j + 1) % 15] === 2 && (discovered[tail[j] + 1] !== -1 || tail[j] === tier))
                    tailBonus += blueChance;
            }
            const score = bonus + chainChance * (tail.length + tailBonus);
            if (!best || score > best.score || (score === best.score && tier > best.tier))
                best = { tier, target, tail, score };
        }
    }
    if (!best) return null;
    const layout = board.slice();
    const fixed = new Set();
    for (const [offset, tier] of [best.tier, ...best.tail].entries()) {
        const slot = best.target + offset;
        if (layout[slot] !== tier) {
            const from = working.find((index) => !fixed.has(index) && layout[index] === tier);
            if (from === undefined) throw new Error("Planned sushi is missing; stopped.");
            [layout[slot], layout[from]] = [layout[from], layout[slot]];
        }
        fixed.add(slot);
    }
    let source = working.find((index) => !fixed.has(index) && layout[index] === best.tier);
    if (source === undefined) throw new Error("Matching sushi is missing; stopped.");
    // Leave an empty cell after the tail so native Wind cannot reach unplanned sushi.
    const end = best.target + best.tail.length + 1;
    if (usable.has(end)) {
        [layout[source], layout[end]] = [layout[end], layout[source]];
        source = end;
    }
    return { ...best, source, layout };
}
