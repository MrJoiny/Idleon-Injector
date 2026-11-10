import { cList, events, gga } from "../../core/globals.js";
import { cheatConfig } from "../../core/state.js";
import { buyCheapestFirst, settingsById } from "./engine.js";

// OptionsListAccount: 253 = feathers, 254 + i = level of upgrade i, 263 = feathers produced this run.
// cList.Owlz rows 0-8 are Orion's upgrades (Poppy's follow). Upgrade i unlocks once the run has produced Owlz[i][3];
// 4 is Feather Restart, 8 The Great Mega Reset.
const owlUpgrades = () => cList.Owlz.slice(0, 9);
const summoning = (...args) => events(579)._customBlock_Summoning(...args);
const isUnlocked = (i) => i === 0 || gga.OptionsListAccount[263] >= Number(cList.Owlz[i][3]);

/** Orion's feathers and upgrades for the Account > Autobuy > Clickers tab. */
export function getAutobuyOrion() {
    const ola = gga.OptionsListAccount;
    return {
        feathers: ola[253],
        rate: summoning("OwlFeatherRate", 0, 0),
        upgrades: owlUpgrades().map((row, i) => ({
            id: i,
            name: row[0],
            level: ola[254 + i],
            cost: summoning("OwlCost", i, 0),
            unlockAt: i === 0 ? 0 : Number(row[3]),
            unlocked: isUnlocked(i),
        })),
    };
}

/**
 * Buy switched-on owl upgrades through the owl's own buy event, which also runs both resets.
 * It works with the owl menu closed but skips the game's unlock check, so locked upgrades are filtered here.
 */
export function runOrion() {
    const { saving, items } = cheatConfig.autobuy.orion;
    const settings = settingsById(items);

    const upgrades = () =>
        owlUpgrades().flatMap((row, i) => {
            const entry = settings.get(String(i));
            if (!entry?.on || !isUnlocked(i) || gga.OptionsListAccount[254 + i] >= (entry.stopAt ?? Infinity))
                return [];
            return [
                {
                    cost: summoning("OwlCost", i, 0),
                    priority: entry.priority,
                    buy: () => {
                        const owl = gga.PixelHelperActor[25].behaviors.getBehavior("ActorEvents_670");
                        owl._TRIGGEREDtext = `a${i}`;
                        owl._customEvent_OwlStuffz();
                    },
                },
            ];
        });

    buyCheapestFirst(upgrades, () => gga.OptionsListAccount[253], saving);
}
