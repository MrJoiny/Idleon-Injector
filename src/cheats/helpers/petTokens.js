import { events, gga } from "../core/globals.js";
import { getOwnedCompanions } from "../proxies/firebase.js";

/**
 * Pet bonus tokens as the game sees them.
 *
 * Token sources and the token blacklist are parsed from game code so new sources
 * are picked up without an injector update. A failed parse yields an empty list:
 * no grant offer and no blacklist guard, which the game itself tolerates.
 */
export function getPetTokens() {
    const stuff2 = events(579)._customBlock_Stuff2;
    // Each OptionsListAccount index summed into Stuff2("PetBonusTokensOwned") is one token source.
    const ownedBranch = String(stuff2).match(/"PetBonusTokensOwned"==\w+\?(.*?):"\w+"==/)?.[1] ?? "";
    const sources = [...ownedBranch.matchAll(/"OptionsListAccount"\)\[(\d+)\]/g)].map((match) => Number(match[1]));
    // ActorEvents_577.init drops these ids from the token list on load.
    const blacklist =
        String(events(577).prototype.init)
            .match(/\[606\]\)\)\.split\(","\)[\s\S]{0,600}?"(\d+(?: \d+)*)"\.split\(" "\)/)?.[1]
            .split(" ")
            .map(Number) ?? [];
    const picks = gga.OptionsListAccount[606];

    return {
        owned: stuff2("PetBonusTokensOwned", 0, 0),
        missing: sources.filter((index) => !(Number(gga.OptionsListAccount[index]) >= 1)),
        picks: picks ? String(picks).split(",").map(Number) : [],
        blacklist,
        ownedPets: getOwnedCompanions().map((entry) => {
            const parts = String(entry).split(",");
            return { id: Number(parts[0]), plus: parts[4] === "1" };
        }),
    };
}
