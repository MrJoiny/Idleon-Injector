# Design decisions

Record a decision, its reason, and its trade-off here. Include alternatives when they are known.
Do not infer historical intent from the implementation or maintain a second description of its behavior.

## Keep documentation thin

Decision: use docs for navigation, domain language, design rationale, and user workflows or safety guidance.
Keep implementation contracts beside their source when an explanation is necessary.

Why: descriptions of algorithms, field lists, startup order, and copied code can drift independently of the code.
Names and structure should make the implementation understandable.

Alternative: maintain a separate implementation reference or tutorial for each module.

Trade-off: contributors must read source for exact behavior. A small [architecture map](architecture.md)
provides entry points without duplicating it.

Update the map when a top-level area or runtime boundary changes. Define new terms once in the
[glossary](glossary.md). Update an existing decision when its trade-off changes.

## Preserve original method side effects

Decision: method hooks follow the base-first convention.

Why: the original game method may update state as well as return a value.
Replacing its result must not silently skip those side effects.

Alternative: return a cheat value before invoking the original method.

Trade-off: the original work still runs even when its result will be overridden.

Source: [proxy utilities](../src/cheats/utils/proxy.js).

## Preserve editable row identity

Decision: keep editable Account rows stable when their values change.
Choose simpler rebuilding only where losing transient input or feedback state is acceptable.

Why: rebuilding an active row can lose focus, draft text, or write feedback.

Alternative: rebuild the whole section whenever any row changes.

Trade-off: stable rows require explicit value updates and collection reconciliation.

Source: [Account components](../src/ui/components/views/account/components/),
[Account shared helpers](../src/ui/components/views/account/accountShared.js).
