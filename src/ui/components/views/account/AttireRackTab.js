import van from "../../../vendor/van-1.6.0.js";
import { executeCheatAction, fetchConfig, saveConfigFile } from "../../../services/api.js";
import { createAttireAppearancePanel } from "./AttireAppearancePanel.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { useWriteStatus } from "./accountShared.js";

const { div, button, span, p } = van.tags;
export const AttireRackTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Attire Rack" });
    const { status, run: runWrite } = useWriteStatus();
    const data = van.state(null);
    const catalog = van.state([]);
    const feedback = van.state("");
    const busy = () => loading.val || status.val === "loading";
    const read = async () => {
        const response = await executeCheatAction("wide attire status");
        if (!response.result || !Array.isArray(response.result.outfits))
            throw new Error(response.result || "Attire data unavailable.");
        data.val = response.result;
        if (JSON.stringify(catalog.val) !== JSON.stringify(response.result.outfits))
            catalog.val = response.result.outfits;
        appearance.sync(response.result);
    };
    const load = () => runLoad(read);
    const select = (ids) =>
        runWrite(
            async () => {
                feedback.val = "";
                const response = await executeCheatAction(`wide attire set ${ids.join(",")}`);
                if (!response.result || !Array.isArray(response.result.selected))
                    throw new Error(response.result || "Could not change attire.");
                await read();
                const config = await fetchConfig();
                if (!config.cheatConfig) throw new Error("Bonuses applied, but settings could not be read for saving.");
                const startupCheats = (config.startupCheats ?? []).filter(
                    (command) => !/^wide attire(?: |$)/.test(command)
                );
                if (ids.length) startupCheats.push(`wide attire set ${ids.join(",")}`);
                try {
                    await saveConfigFile({ ...config, startupCheats });
                } catch (caught) {
                    throw new Error(`Bonuses updated, but selection could not be saved: ${caught.message}`);
                }
                feedback.val = "Selection saved. Bonuses updated.";
            },
            {
                onError: (caught) => {
                    feedback.val = caught.message;
                },
            }
        );
    const toggle = (id) => {
        const ids = new Set(data.val.selected);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        return select([...ids]);
    };
    const appearance = createAttireAppearancePanel({ catalog, busy, runWrite, read });
    load();
    return PersistentAccountListPage({
        title: "ATTIRE RACK",
        description: "Enable outfit bonuses individually, regardless of which outfit you wear.",
        actions: RefreshButton({ onRefresh: load, disabled: busy }),
        state: { loading, error },
        loadingText: "READING ATTIRE",
        body: div(
            { class: "attire-rack" },
            p(
                "Selected outfits grant their full base stats and miscellaneous bonuses while the injector is running. Your worn outfit always keeps its normal bonuses and is counted once. Lava's robes are excluded. Bonuses are inactive in dungeons."
            ),
            appearance.node,
            p(() =>
                data.val ? `Research attire bonus: +${data.val.research}%. Applied to miscellaneous bonuses.` : ""
            ),
            div(
                { class: "attire-rack__actions" },
                button(
                    {
                        class: "btn-secondary",
                        disabled: busy,
                        onclick: () => select(data.val.outfits.map(({ id }) => id)),
                    },
                    "ALL ON"
                ),
                button({ class: "btn-secondary", disabled: busy, onclick: () => select([]) }, "ALL OFF"),
                span({ role: "status", "aria-live": "polite" }, () =>
                    status.val === "loading" ? "SAVING..." : feedback.val
                )
            ),
            div({ class: "attire-rack__grid", "aria-busy": () => status.val === "loading" }, () =>
                div(
                    { class: "attire-rack__cards" },
                    ...catalog.val.map((outfit) =>
                        div(
                            { class: "attire-rack__card" },
                            div(
                                { class: "attire-rack__heading" },
                                span(outfit.name),
                                button(
                                    {
                                        class: "btn-secondary",
                                        role: "switch",
                                        "aria-label": `Enable ${outfit.name} bonuses`,
                                        "aria-checked": () =>
                                            data.val.selected.includes(outfit.id) ? "true" : "false",
                                        disabled: busy,
                                        onclick: () => toggle(outfit.id),
                                    },
                                    () => (data.val.selected.includes(outfit.id) ? "ON" : "OFF")
                                )
                            ),
                            p(
                                Object.entries(outfit.stats)
                                    .filter(([, value]) => value)
                                    .map(([key, value]) => `+${value} ${key.replace(/_/g, " ")}`)
                                    .join(" · ")
                            ),
                            ...outfit.bonuses.map(({ key, value }) => p(`+${value}${key.replace(/_/g, " ")}`)),
                            span({ class: "attire-rack__worn" }, () =>
                                data.val.equipped === outfit.id ? "CURRENTLY WORN — counted once" : ""
                            )
                        )
                    )
                )
            )
        ),
    });
};
