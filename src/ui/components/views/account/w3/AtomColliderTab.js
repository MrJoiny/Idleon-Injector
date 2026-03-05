/**
 * W3 — Atom Collider Tab
 *
 * Data sources:
 *   gga.Atoms[b]                     — current level of atom b
 *   gga.CustomLists.h.AtomInfo[b][0] — atom name (underscores → spaces)
 *
 * Max level is NOT stored in a data table — it is computed per-atom via:
 *   m._customBlock_AtomCollider("AtomMaxLv", b, 0)
 * which maps to: readComputed("AtomCollider", "AtomMaxLv", [b, 0])
 *
 * All per-atom max level requests are made in parallel during load.
 * Array length is taken from CustomLists.h.AtomInfo.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

const toArr = (raw) =>
    Array.isArray(raw)
        ? raw
        : Object.keys(raw ?? {}).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// ── AtomRow ────────────────────────────────────────────────────────────────

const AtomRow = ({ index, name, maxLevel, initialLevel }) => {
    const levelDisplay = van.state(initialLevel);
    const inputVal = van.state(String(initialLevel));
    const status = van.state(null);

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, safeNum(raw)));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeGga(`Atoms[${index}]`, lvl);
            levelDisplay.val = lvl;
            inputVal.val = String(lvl);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "feature-row",
                status.val === "success" ? "feature-row--success" : "",
                status.val === "error" ? "feature-row--error" : "",
            ].filter(Boolean).join(" "),
        },

        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name),
        ),

        span(
            { class: "feature-row__badge" },
            () => `LV ${levelDisplay.val} / ${maxLevel}`
        ),

        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, safeNum(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(maxLevel, safeNum(inputVal.val) + 1))),
            }),
            button(
                {
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            ),
        ),
    );
};

// ── AtomColliderTab ────────────────────────────────────────────────────────

export const AtomColliderTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const bulkStatus = van.state(null); // "loading" | "done" | null

    // targetLevel: null = each atom's own max, 0 = reset
    const doSetAll = async (targetLevel) => {
        if (!data.val || data.val.atoms.length === 0) return;
        bulkStatus.val = "loading";
        try {
            for (let i = 0; i < data.val.atoms.length; i++) {
                const lvl = targetLevel === null ? data.val.atoms[i].maxLevel : targetLevel;
                await writeGga(`Atoms[${i}]`, lvl);
                await new Promise((r) => setTimeout(r, 20));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
            await load();
        } catch {
            bulkStatus.val = null;
        }
    };

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [rawLevels, rawAtomInfo] = await Promise.all([
                readGga("Atoms"),
                readGga("CustomLists.h.AtomInfo"),
            ]);

            const atomInfoArr = toArr(rawAtomInfo ?? []);

            // Fetch computed max level for each atom in parallel.
            const maxLevels = await Promise.all(
                atomInfoArr.map((_, i) =>
                    readComputed("atomCollider", "AtomMaxLv", [i, 0])
                        .then((v) => safeNum(v))
                        .catch(() => 0)
                )
            );

            const atoms = atomInfoArr.map((entry, i) => {
                const e = toArr(entry ?? []);
                const name = String(e[0] ?? `Atom ${i + 1}`).replace(/\+\{/g, "").replace(/_/g, " ").trim();
                return { name, maxLevel: maxLevels[i] ?? 0 };
            });

            const rawArr = toArr(rawLevels ?? []);
            const levels = atoms.map((_, i) => safeNum(rawArr[i]));

            data.val = { levels, atoms };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ATOM COLLIDER"),
                p({ class: "feature-header__desc" }, "Set Atom Collider upgrade levels. Max levels are computed from game data."),
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(null),
                    },
                    "MAX ALL"
                ),
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(0),
                    },
                    "RESET ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val });
            if (!data.val) return null;

            const { levels, atoms } = data.val;
            if (!atoms.length) return EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Atom Collider data found." });

            return div(
                { class: "feature-list" },
                ...atoms.map((a, i) =>
                    AtomRow({
                        index: i,
                        name: a.name,
                        maxLevel: a.maxLevel,
                        initialLevel: levels[i],
                    })
                )
            );
        }
    );
};
