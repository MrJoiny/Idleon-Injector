import { firebase } from "../core/globals.js";

/** Match ActorEvents_189.IncreaseExpREQ without its task and hint side effects. */
export function getPlayerExpRequired(index, level) {
    if (!Number.isInteger(index) || index < 0 || index > 20 || !Number.isSafeInteger(level) || level < 1) {
        throw new Error("Invalid player level or skill index");
    }
    let required;
    switch (index) {
        case 0:
            required =
                (15 + Math.pow(level, 1.9) + 11 * level) *
                    Math.pow(1.208 - Math.min(0.164, (0.215 * level) / (level + 100)), level) -
                15;
            break;
        case 2:
            required =
                (15 + Math.pow(level, 2) + 13 * level) *
                    Math.pow(1.225 - Math.min(0.114, (0.135 * level) / (level + 50)), level) -
                26;
            break;
        case 8:
            required =
                level < 71
                    ? ((10 + Math.pow(level, 2.81) + 4 * level) *
                          Math.pow(1.117 - (0.135 * level) / (level + 5), level) -
                          6) *
                      (1 + Math.pow(level, 1.72) / 300)
                    : (((10 + Math.pow(level, 2.81) + 4 * level) * Math.pow(1.003, level) - 6) / 2.35) *
                      (1 + Math.pow(level, 1.72) / 300);
            break;
        case 9:
            required =
                (15 + Math.pow(level, 1.3) + 6 * level) *
                    Math.pow(1.17 - Math.min(0.07, (0.135 * level) / (level + 50)), level) -
                26;
            break;
        case 11:
            required = (10 + (Math.pow(level, 1.9) + 10 * level)) * Math.pow(1.11, level);
            break;
        case 12:
            required =
                level < 5
                    ? 6.4 * level * Math.pow(1.6, level)
                    : (10 + (Math.pow(level, 1.3) + 24 * level)) * Math.pow(1.024, level) - 9 * level;
            break;
        case 13:
            required = (10 + (Math.pow(level, 1.6) + 5 * level)) * Math.pow(1.08, level);
            break;
        case 14:
            required = (9 + Math.pow(level, 1.4) + 3 * level) * Math.pow(1.1 - (0.08 * level) / (level + 20), level);
            break;
        case 15:
            required =
                (10 + (Math.pow(level, 1.6) + 3 * level)) *
                Math.pow(1.13, level) *
                Math.pow(1.13, Math.max(0, level - 20));
            break;
        case 16:
            required =
                -100 +
                (12 + 2 * level) *
                    (1 + level / 30) *
                    Math.pow(2, level / 30) *
                    Math.pow(1.25, level / 8) *
                    (Math.pow(1.075, level) + 2 * level) *
                    (1 + 0.3 * Math.floor(level / 10));
            break;
        case 17:
            required =
                (15 + Math.pow(level, 2) + 13 * level) *
                    Math.pow(1.245 - Math.min(0.114, (0.135 * level) / (level + 50)), level) -
                10;
            break;
        case 18:
            required =
                (15 + Math.pow(level, 1.7) + 7 * level) *
                    Math.pow(1.175 - Math.min(0.15, (0.115 * level) / (level + 50)), level) -
                25;
            break;
        case 19:
            required =
                (20 + Math.pow(level, 3) + 25 * level) *
                    Math.pow(1.19 - Math.min(0.15, (0.2 * level) / (level + 50)), level) -
                63;
            break;
        case 20:
            required =
                10 * Math.max(0, level - 1) +
                10 *
                    (1 + Math.pow(level, 1 + 0.4 * (level / 10)) / 10) *
                    Math.pow(1.1, level) *
                    Math.pow(Math.max(1, firebase.getServerVarLoad("A_ResXP")), Math.max(0, level - 20));
            break;
        default:
            required =
                (15 + Math.pow(level, 2) + 15 * level) *
                    Math.pow(1.225 - Math.min(0.18, (0.135 * level) / (level + 50)), level) -
                30;
    }
    if (!Number.isFinite(required)) throw new Error("This level exceeds the game's finite XP range");
    // New character slots start at 15 XP; a few low-level formulas are nonpositive.
    return required > 0 ? required : 15;
}
