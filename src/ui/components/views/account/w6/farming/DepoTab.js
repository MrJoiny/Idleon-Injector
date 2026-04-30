import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createIndexedStateGetter,
    createStaticRowReconciler,
    toInt,
} from "../../accountShared.js";

const { div } = van.tags;

const CROP_DEPO_PATH = "FarmCrop.h";

const buildSeedRanges = (rawSeedInfo) =>
    toIndexedArray(rawSeedInfo ?? []).map((rawSeed, index) => {
        const seed = toIndexedArray(rawSeed ?? []);
        return {
            index,
            name: cleanName(seed[0], "Crop"),
            start: toInt(seed[2], { min: 0 }),
            end: toInt(seed[3], { min: 0 }),
        };
    });

const CropAmountRow = ({ entry, amountState }) =>
    SimpleNumberRow({
        entry,
        valueState: amountState,
    });

const getCropAmount = (rawCropDepo, index) => {
    const amount = rawCropDepo?.[index];
    return amount === undefined || amount === null ? 0 : amount;
};

const buildSeedSections = (rawCropDepo, rawSeedInfo) =>
    buildSeedRanges(rawSeedInfo).map((seed) => ({
        ...seed,
        crops: Array.from({ length: seed.end - seed.start + 1 }, (_, offset) => {
            const index = seed.start + offset;
            return {
                index,
                name: `${seed.name} ${offset + 1}`,
                path: `${CROP_DEPO_PATH}[${index}]`,
                amount: getCropAmount(rawCropDepo, index),
                float: true,
            };
        }),
    }));

export const DepoTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Depo" });
    const seedSections = van.state([]);
    const getAmountState = createIndexedStateGetter();
    const sectionListNode = div({ class: "content-stack" });
    const reconcileSectionList = createStaticRowReconciler(sectionListNode);
    const sectionNodes = new Map();
    const reconcilers = new Map();

    const getSectionNode = (seedIndex) => {
        if (!sectionNodes.has(seedIndex)) {
            const node = div({ class: "account-item-stack account-item-stack--dense" });
            sectionNodes.set(seedIndex, node);
            reconcilers.set(seedIndex, createStaticRowReconciler(node));
        }
        return sectionNodes.get(seedIndex);
    };

    const reconcileSection = (section) => {
        const node = getSectionNode(section.index);
        reconcilers.get(section.index)(section.crops.map((crop) => `${crop.index}:${crop.name}`).join("|"), () =>
            section.crops.map((crop) => CropAmountRow({ entry: crop, amountState: getAmountState(crop.index) }))
        );
        return node;
    };

    const reconcileSections = () => {
        reconcileSectionList(
            seedSections.val
                .map((section) => `${section.index}:${section.name}:${section.start}:${section.end}`)
                .join("|"),
            () =>
                seedSections.val.map((section) =>
                    AccountSection({
                        title: section.name,
                        note: `${section.crops.length} CROPS, INDEX ${section.start}-${section.end}`,
                        body: reconcileSection(section),
                    })
                )
        );
    };

    const load = async () =>
        run(async () => {
            const [rawCropDepo, rawSeedInfo] = await Promise.all([gga(CROP_DEPO_PATH), readCList("SeedInfo")]);
            seedSections.val = buildSeedSections(rawCropDepo, rawSeedInfo);

            for (const section of seedSections.val) {
                for (const crop of section.crops) {
                    getAmountState(crop.index).val = crop.amount;
                }
            }

            reconcileSections();
        });

    load();

    const body = div({ class: "scrollable-panel content-stack" }, sectionListNode);

    return PersistentAccountListPage({
        title: "DEPO",
        description: "Edit W6 Farming crop depo amounts from FarmCrop.h. Missing crops from SeedInfo show as 0.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING FARMING DEPO",
        errorTitle: "FARMING DEPO READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
