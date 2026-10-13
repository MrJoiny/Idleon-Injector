# Account pages

Account editors can change progression and other save-sensitive values. Check the field's meaning and warning
before writing. An inferred label is not proof that a value is safe to change.

For terminology, see the [glossary](glossary.md). For the rendering trade-off, see
[preserve editable row identity](decisions.md#preserve-editable-row-identity).

## Where to start

- [Account.js](../src/ui/components/views/Account.js): Account navigation.
- [Account feature directory](../src/ui/components/views/account/): world and feature editors.
- [Shared components](../src/ui/components/views/account/components/): editable rows and page controls.
- [accountShared.js](../src/ui/components/views/account/accountShared.js): shared read/write helpers.
- [Account schema](../src/ui/config/optionsAccountSchema.json): raw option labels and warnings.

Read the relevant feature and shared component before changing an editor. Their source owns the rendering
and write contracts.
