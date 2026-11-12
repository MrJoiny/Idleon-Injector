import { gga, events } from "../core/globals.js";
import { cheatConfig, cheatState } from "../core/state.js";
import { characterAttire, applyCharacterAttire } from "./attireAppearance.js";
import { attireCatalog, configuredAttire } from "./attireRack.js";

export function attireAction(action, args = {}) {
    if (action === "status")
        return {
            enabled: Boolean(cheatState.wide.attire),
            selected: configuredAttire(gga.ItemDefinitionsGET.h, cheatConfig.wide.attire),
            equipped: gga.EquipmentOrder[0][15],
            research: events(579)._customBlock_ResearchStuff("Grid_Bonus", 172, 0),
            outfits: attireCatalog(gga.ItemDefinitionsGET.h),
            current: gga.UserInfo[0],
            characters: characterAttire(gga),
        };
    if (action === "wear")
        return applyCharacterAttire(gga, args, () => {
            gga.DNSM.h.TotStatMAP.h = {};
            events(12)._customBlock_TotalStats("calcEtcBonuses");
        });
    throw new Error("Unknown attire action.");
}
