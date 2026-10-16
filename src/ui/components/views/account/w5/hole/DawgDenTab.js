import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { toNum } from "../../accountShared.js";
import { SimpleAccountListPage } from "../../components/SimpleAccountListPage.js";

export const DawgDenTab = () =>
    SimpleAccountListPage({
        title: "DAWG DEN",
        description: "Edit Dawg Den highscore from Holes[11][8].",
        label: "Hole Dawg Den",
        loadEntries: async () => {
            const holes = await gga("Holes");
            const stats = toIndexedArray(toIndexedArray(holes)[11]);
            return [
                {
                    key: "dawg-den-highscore",
                    index: 8,
                    name: "Highscore",
                    path: "Holes[11][8]",
                    value: toNum(stats[8], 0),
                },
            ];
        },
    });
