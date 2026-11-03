import { gga, events } from "../core/globals.js";
import { cheatState } from "../core/state.js";
import { characterAttire, applyCharacterAttire } from "./attireAppearance.js";
import { attireCatalog } from "./attireRack.js";

let selectedOutfits = null;
export function attireRackSelection() {
    if (!cheatState.wide.attire) return [];
    if (selectedOutfits === null) selectedOutfits = attireCatalog(gga.ItemDefinitionsGET.h).map(({ id }) => id);
    return selectedOutfits;
}
export function attireRackCommand(params) {
    const [action, list = ""] = params.slice(1);
    const catalog = attireCatalog(gga.ItemDefinitionsGET.h);
    if (action === "status")
        return {
            enabled: Boolean(cheatState.wide.attire),
            selected: attireRackSelection(),
            equipped: gga.EquipmentOrder[0][15],
            research: events(579)._customBlock_ResearchStuff("Grid_Bonus", 172, 0),
            outfits: catalog,
            current: gga.UserInfo[0],
            characters: characterAttire(gga),
        };
    if (action === "wear") {
        return applyCharacterAttire(gga, JSON.parse(decodeURIComponent(list)), () => {
            gga.DNSM.h.TotStatMAP.h = {};
            events(12)._customBlock_TotalStats("calcEtcBonuses");
        });
    }
    if (![undefined, "on", "off", "set"].includes(action))
        throw new Error("Use wide attire [on|off|set IDs|wear request|status].");
    if (action === "set") {
        const ids = list ? [...new Set(list.split(","))] : [];
        if (ids.some((id) => !catalog.some((item) => item.id === id)))
            throw new Error("Unknown attire; selection unchanged.");
        selectedOutfits = ids;
        cheatState.wide.attire = ids.length > 0;
    } else cheatState.wide.attire = action === "on" ? true : action === "off" ? false : !cheatState.wide.attire;
    if (cheatState.wide.attire && !selectedOutfits?.length) selectedOutfits = catalog.map(({ id }) => id);
    gga.DNSM.h.TotStatMAP.h = {};
    events(12)._customBlock_TotalStats("calcEtcBonuses");
    return { enabled: Boolean(cheatState.wide.attire), selected: attireRackSelection() };
}
