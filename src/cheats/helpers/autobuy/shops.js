import { cList, events, gga, itemDefs } from "../../core/globals.js";
import { cheatConfig, cheatState } from "../../core/state.js";
import { buyCheapestFirst } from "./engine.js";

/**
 * Town shops with today's stock, grouped by world for the Account > Autobuy tab.
 * Shop i sells cList.ShopNames[i] in the town map cList.ShopLocations[i]; maps 0-49 are W1, 50-99 W2, ...
 */
export function getAutobuyShops() {
    return cList.ShopNames.map((items, shop) => {
        const map = Number(cList.ShopLocations[shop]);
        return {
            shop,
            world: Math.floor(map / 50) + 1,
            town: cList.MapDispName[map],
            items: items.map((item, slot) => ({
                item,
                name: itemDefs[item].h.displayName,
                stock: gga.ShopStock[shop][slot],
            })),
        };
    });
}

/**
 * Buy switched-on shop items that have stock, paying with chest coins and delivering into the chest.
 * The shop's own buy (ShopTap) only fills the inventory, so each buy mirrors its Money/ShopStock changes
 * and hands the items to GiveItem with the chest flag, the way the refinery and printer do.
 */
export function runShops() {
    buyCheapestFirst(shopItems, () => gga.MoneyBANK);
}

function shopItems() {
    const owned = gga.ChestOrder.slice(0, gga.ChestSlotsOwned);
    const blanks = owned.filter((name) => name === "Blank").length;

    return cheatConfig.autobuy.shops.flatMap(({ id, on, stopAt }) => {
        if (!on) return [];
        const [shop, item] = id.split(":");
        const slot = cList.ShopNames[shop]?.indexOf(item) ?? -1;
        const stock = gga.ShopStock[shop]?.[slot];
        if (!(stock > 0)) return [];

        const price = events(12)._customBlock_RunCodeOfTypeXforThingY("BuyPrice", item);
        // Stop-at counts what the chest already holds.
        const held = owned.reduce(
            (sum, name, index) => (name === item ? sum + Number(gga.ChestQuantity[index]) : sum),
            0
        );
        let amount = Math.min(stock, (stopAt ?? Infinity) - held);
        if (price > 0) amount = Math.min(amount, Math.floor(gga.MoneyBANK / price));

        // GiveItem silently drops whatever does not fit, so only buy what the chest can take.
        const stackable = itemDefs[item].h.typeGen[0] !== "a";
        if (stackable) {
            // "nocap" merges into the first matching stack (up to 2e9 unless storagecap lifts it) or one blank slot.
            const index = owned.indexOf(item);
            if (index < 0 && !blanks) return [];
            if (index >= 0 && !cheatState.wide.storagecap) amount = Math.min(amount, 2e9 - gga.ChestQuantity[index]);
        } else {
            // Equipment, bags and stamps hold one per slot; "nocap" would merge them, so use the capped flag.
            amount = Math.min(amount, blanks);
        }
        if (!(amount > 0)) return [];

        return [
            {
                cost: price,
                buy: () => {
                    gga.MoneyBANK -= amount * price;
                    gga.ShopStock[shop][slot] -= amount;
                    gga.DummyText2 = stackable ? "YESputInChest8910nocap" : "YESputInChest8910";
                    gga.DummyText2 = "" + events(124)._customBlock_GiveItem(item, amount);
                },
            },
        ];
    });
}
