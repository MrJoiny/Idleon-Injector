import van from "../../../vendor/van-1.6.0.js";
import store from "../../../state/store.js";
import { executeCheatAction, performGameAction } from "../../../services/api.js";
import { createAttireAppearancePanel } from "./AttireAppearancePanel.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { useWriteStatus } from "./accountShared.js";
const { div, button, span, p } = van.tags;
export const AttireRackTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Attire Rack" });
    const { status, run: runWrite } = useWriteStatus();
    const data = van.state(null),
        catalog = van.state([]),
        feedback = van.state("");
    const busy = () => loading.val || status.val === "loading";
    const read = async () => {
        const result = await performGameAction("attire", "status");
        if (!result || !Array.isArray(result.outfits)) throw new Error("Attire data unavailable.");
        data.val = result;
        if (JSON.stringify(catalog.val) !== JSON.stringify(result.outfits)) catalog.val = result.outfits;
        appearance.sync(result);
    };
    const load = () => runLoad(read);
    const toggle = () =>
        runWrite(
            async () => {
                await executeCheatAction("wide attire");
                await read();
            },
            {
                onError: (caught) => {
                    feedback.val = caught.message;
                },
            }
        );
    const appearance = createAttireAppearancePanel({ catalog, busy, runWrite, read });
    load();
    return PersistentAccountListPage({
        title: "ATTIRE RACK",
        description: "Outfit bonuses and character appearance.",
        actions: RefreshButton({ onRefresh: load, disabled: busy }),
        state: { loading, error },
        loadingText: "READING ATTIRE",
        body: div(
            { class: "attire-rack scrollable-panel content-stack" },
            div(
                { class: "attire-rack__actions" },
                button({ class: "btn-secondary", disabled: busy, onclick: toggle }, () =>
                    data.val?.enabled ? "DISABLE BONUSES" : "ENABLE BONUSES"
                ),
                button(
                    {
                        class: "btn-secondary",
                        disabled: busy,
                        onclick: () => store.navigateToCheatConfig("wide attire"),
                    },
                    "CONFIGURE BONUSES"
                ),
                span({ role: "status", "aria-live": "polite" }, () =>
                    status.val === "loading" ? "WORKING..." : feedback.val
                )
            ),
            p(
                "Choose outfits in Config, then apply to the session or save. All includes future outfits. Worn attire is counted once; rack bonuses are inactive in dungeons."
            ),
            div({ class: "attire-rack__grid" }, () =>
                div(
                    { class: "attire-rack__cards" },
                    ...catalog.val.map((outfit) =>
                        div(
                            { class: "attire-rack__card" },
                            div(
                                { class: "attire-rack__heading" },
                                span(outfit.name),
                                span(() => (data.val.selected.includes(outfit.id) ? "SELECTED" : "OFF"))
                            ),
                            p(
                                Object.entries(outfit.stats)
                                    .filter(([, value]) => value)
                                    .map(([key, value]) => "+" + value + " " + key.replace(/_/g, " "))
                                    .join(" · ")
                            ),
                            ...outfit.bonuses.map(({ key, value }) => p("+" + value + key.replace(/_/g, " "))),
                            span({ class: "attire-rack__worn" }, () =>
                                data.val.equipped === outfit.id ? "CURRENTLY WORN" : ""
                            )
                        )
                    )
                )
            ),
            appearance.node
        ),
    });
};
