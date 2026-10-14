import { cList } from "../core/globals.js";

/** Decode the current jar-gem definitions while preserving their ownership-array indices. */
export function getJarGemCatalog() {
    return cList.HolesInfo[67].map((raw, index) => {
        const parts = raw.split("|");
        return { index, name: parts[0], commandName: parts[0].toLowerCase(), description: parts[3] };
    });
}
