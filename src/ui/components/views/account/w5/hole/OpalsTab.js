import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { cleanName, toNum } from "../../accountShared.js";
import { SimpleAccountListPage } from "../../components/SimpleAccountListPage.js";

export const OpalsTab = () =>
    SimpleAccountListPage({
        title: "OPALS",
        description: "Edit opals found per cavern from Holes[7].",
        label: "Hole Opals",
        sectionTitle: "OPALS FOUND",
        loadEntries: async () => {
            const [holes, caves] = await Promise.all([gga("Holes"), readCList("HolesInfo[68]")]);
            const values = toIndexedArray(toIndexedArray(holes)[7]);
            const names = toIndexedArray(caves ?? []);
            return values
                .map((value, index) => {
                    const name = cleanName(names[index], "");
                    if (!name || name.toLowerCase() === "bruh") return null;
                    return {
                        key: `opal-${index}`,
                        index,
                        name,
                        path: `Holes[7][${index}]`,
                        value: toNum(value, 0),
                    };
                })
                .filter(Boolean);
        },
    });
