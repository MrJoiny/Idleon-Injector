import { NametagTab } from "./NametagTab.js";
import { TrophyTab } from "./TrophyTab.js";
import { createNestedTab } from "../tabShared.js";

const GALLERY_SUBTABS = [
    { id: "trophy", label: "TROPHY", component: TrophyTab },
    { id: "nametag", label: "NAMETAG", component: NametagTab },
];

export const GalleryTab = createNestedTab(GALLERY_SUBTABS, "", "data-gallery");
