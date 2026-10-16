import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { cleanNameEffect, toNum } from "../../accountShared.js";
import { SimpleAccountListPage } from "../../components/SimpleAccountListPage.js";

export const MeasureTab = () =>
    SimpleAccountListPage({
        title: "MEASURE",
        description: "Edit Villager Measure upgrade levels from Holes[22].",
        label: "Hole Measure",
        sectionTitle: "MEASURE UPGRADES",
        loadEntries: async () => {
            const [holes, effects] = await Promise.all([gga("Holes"), readCList("HolesInfo[54]")]);
            const values = toIndexedArray(toIndexedArray(holes)[22]);
            const names = toIndexedArray(effects ?? []);
            return values
                .map((value, index) => {
                    const name = cleanNameEffect(names[index], "")
                        .replace(/\u8bbf/g, "&")
                        .trim();
                    if (!name) return null;
                    return {
                        key: `measure-${index}`,
                        index,
                        name,
                        path: `Holes[22][${index}]`,
                        value: toNum(value, 0),
                        badge: (currentValue) => `LV ${currentValue ?? 0}`,
                    };
                })
                .filter(Boolean);
        },
    });
