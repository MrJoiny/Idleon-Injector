import van from "../../../../vendor/van-1.6.0.js";
import { EmptyState } from "../../../EmptyState.js";
import { SearchBar } from "../../../SearchBar.js";
import { Icons } from "../../../../assets/icons.js";
import { deleteGga, gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountToggleRow } from "../components/AccountToggleRow.js";
import { InlineEditableNumberField } from "../components/InlineEditableNumberField.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    getOrCreateState,
    runBulkSet,
    toInt,
    toNum,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { button, div, img, span } = van.tags;

const firstFiniteNumber = (values, fallback) => {
    for (const value of values) {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return fallback;
};

const cleanUpgradeName = (rawName, fallback) => {
    const name = cleanName(rawName, "", { stripMarker: true })
        .split(/[\u3400-\u9fff(（]/, 1)[0]
        .trim();
    return name || fallback;
};

const readFirstDefinitionTable = async (definitionPaths) => {
    for (const path of definitionPaths) {
        try {
            const value = await readCList(path);
            const rows = toIndexedArray(value ?? []);
            if (rows.length) return { path, rows };
        } catch {
            // Try the next known table name. New masterclass data has moved around between updates.
        }
    }

    return { path: null, rows: [] };
};

const resolveStorageIndex = (rawDefinition, definition, index, getStorageIndex) => {
    if (typeof getStorageIndex === "function") {
        const resolved = Number(getStorageIndex({ rawDefinition, definition, index }));
        if (Number.isInteger(resolved) && resolved >= 0) return resolved;
    }

    return index;
};

const buildUpgrades = ({
    levels,
    definitions,
    order = null,
    fallbackPrefix,
    fallbackMax,
    getStorageIndex = null,
    preferDefinitionCount = false,
    maxLevelIndex = null,
}) => {
    const levelRows = toIndexedArray(levels ?? []);
    const definitionRows = toIndexedArray(definitions ?? []);
    const orderRows = order ? toIndexedArray(order).map(Number).filter((n) => Number.isInteger(n) && n >= 0) : null;
    const count =
        orderRows?.length
            ? orderRows.length
            : preferDefinitionCount && definitionRows.length
            ? definitionRows.length
            : Math.max(levelRows.length, definitionRows.length);

    return Array.from({ length: count }, (_, index) => {
        const storageIndex = orderRows
            ? orderRows[index]
            : resolveStorageIndex(definitionRows[index], toIndexedArray(definitionRows[index] ?? []), index, getStorageIndex);
        const rawDefinition = definitionRows[storageIndex];
        const definition = toIndexedArray(rawDefinition ?? []);
        const rawName = definition[0];
        const maxLevel =
            maxLevelIndex !== null && maxLevelIndex !== undefined
                ? firstFiniteNumber([definition[maxLevelIndex]], fallbackMax)
                : firstFiniteNumber([definition[4], definition[3], definition[2]], fallbackMax);
        const displayIndex = `#${index + 1}`;

        return {
            index,
            storageIndex,
            displayIndex,
            name: cleanUpgradeName(rawName, `${fallbackPrefix} ${index + 1}`),
            maxLevel,
        };
    }).filter((upgrade) => upgrade.maxLevel > 0);
};

const buildStaticUpgrades = (staticUpgrades) =>
    staticUpgrades
        .map((upgrade, index) => {
            const storageIndex = Number(upgrade.storageIndex ?? upgrade.index ?? index);
            const maxLevel = Number(upgrade.maxLevel);
            if (!Number.isInteger(storageIndex) || storageIndex < 0 || !Number.isFinite(maxLevel) || maxLevel <= 0) {
                return null;
            }

            return {
                ...upgrade,
                index,
                storageIndex,
                displayIndex: upgrade.displayIndex?.split(" ")[0] ?? `#${storageIndex}`,
                name: upgrade.name ?? `Upgrade ${index + 1}`,
                maxLevel,
            };
        })
        .filter(Boolean);

const matchesSearch = (upgrade, query) => {
    const search = String(query ?? "")
        .trim()
        .toLowerCase();
    if (!search) return true;

    return (
        upgrade.name.toLowerCase().includes(search) ||
        String(upgrade.index).includes(search) ||
        `#${upgrade.index}`.includes(search)
    );
};

const UpgradeRow = ({ levelsPath, upgrade, levelState, deleteCachePaths = [] }) =>
    ClampedLevelRow({
        valueState: levelState,
        max: upgrade.maxLevel,
        integerMode: "trunc",
        maxAction: {
            label: "MAX",
            value: upgrade.maxLevel,
            tooltip: `Set ${upgrade.name} to level ${upgrade.maxLevel}`,
        },
        writePath: deleteCachePaths.length ? null : `${levelsPath}[${upgrade.storageIndex}]`,
        write: deleteCachePaths.length
            ? async (nextLevel) => {
                  await writeVerified(`${levelsPath}[${upgrade.storageIndex}]`, nextLevel);
                  for (const cachePath of deleteCachePaths) {
                      await deleteGga(cachePath);
                  }
                  return nextLevel;
              }
            : null,
        renderInfo: () => [
            span({ class: "account-row__index" }, upgrade.displayIndex),
            span({ class: "account-row__name" }, upgrade.name),
        ],
        renderBadge: (level) => `LV ${level ?? 0} / ${upgrade.maxLevel}`,
        rowClass: "masterclass-upgrade-row",
        badgeClass: "masterclass-upgrade-row__level",
        controlsClass: "masterclass-upgrade-row__controls",
        applyLabel: "SET",
    });

const fieldPath = (field) => field.path ?? `OptionsListAccount[${field.optionIndex}]`;

const flattenCurrencyFields = (fields, tabs) => [
    ...fields,
    ...tabs.flatMap((tab) => tab.fields ?? []),
];

const FieldLabel = (field) =>
    field.badge
        ? [span({ class: "masterclass-currency__badge" }, field.badge), field.name]
        : field.iconUrl
        ? [
              img({
                  class: "masterclass-currency__icon",
                  src: field.iconUrl,
                  alt: "",
                  loading: "lazy",
              }),
              field.name,
          ]
        : field.name;

const CurrencySection = ({ title, fields, states, tabs = [], activeTab = null }) => {
    const fieldRows = div({ class: "grimoire-currency__fields masterclass-currency__fields" });

    const renderFields = () => {
        const selectedTab = tabs.find((tab) => tab.id === activeTab?.val) ?? tabs[0];
        const visibleFields = tabs.length ? selectedTab?.fields ?? [] : fields;

        fieldRows.replaceChildren(
            ...visibleFields.map((field) =>
                field.type === "toggle"
                    ? AccountToggleRow({
                          info: div(
                              { class: "account-row__name-group" },
                              span({ class: "account-row__name" }, field.name)
                          ),
                          badge: () => (states.get(field.key).val ? "ENABLED" : "DISABLED"),
                          checked: () => Boolean(states.get(field.key).val),
                          rowClass: "grimoire-currency__toggle masterclass-currency__toggle",
                          title: field.title ?? field.name,
                          write: async (enabled) => {
                              const nextValue = enabled ? 1 : 0;
                              await writeVerified(fieldPath(field), nextValue);
                              states.get(field.key).val = nextValue;
                          },
                      })
                    : InlineEditableNumberField({
                          label: () => FieldLabel(field),
                          valueState: states.get(field.key),
                          path: fieldPath(field),
                          rootClass: "grimoire-currency__field masterclass-currency__field",
                          labelClass: "grimoire-currency__label masterclass-currency__label",
                          inputClass: "grimoire-currency__set masterclass-currency__set",
                      })
            )
        );
    };

    van.derive(() => {
        activeTab?.val;
        renderFields();
    });

    return AccountSection({
        title,
        body: [
            tabs.length
                ? div(
                      { class: "masterclass-category-tabs" },
                      ...tabs.map((tab) =>
                          button(
                              {
                                  type: "button",
                                  class: () =>
                                      `masterclass-category-tabs__button${
                                          activeTab.val === tab.id ? " is-active" : ""
                                      }`,
                                  onclick: () => {
                                      activeTab.val = tab.id;
                                  },
                              },
                              tab.label
                          )
                      )
                  )
                : null,
            fieldRows,
        ],
    });
};

export const MasterclassUpgradeTab = ({
    title,
    description,
    levelsPath,
    definitionPaths,
    orderPath = null,
    fallbackPrefix,
    fallbackMax = 999999,
    getStorageIndex = null,
    preferDefinitionCount = false,
    maxLevelIndex = null,
    staticUpgrades = null,
    currencyTitle = null,
    currencyFields = [],
    currencyTabs = [],
    deleteCachePaths = [],
}) => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: title });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const upgrades = van.state([]);
    const searchQuery = van.state("");
    const activeCurrencyTab = van.state(currencyTabs[0]?.id ?? null);
    const allCurrencyFields = flattenCurrencyFields(currencyFields, currencyTabs);
    const currencyStates = new Map(allCurrencyFields.map((field) => [field.key, van.state(0)]));
    const levelStates = new Map();
    const rowNodes = new Map();
    const upgradeRows = div({ class: "account-item-stack account-item-stack--dense masterclass-upgrade-list" });
    const noUpgrades = EmptyState({
        icon: Icons.SearchX(),
        title: `NO ${title} UPGRADES`,
        subtitle: `No ${title} levels or definitions were returned by the running game.`,
    });
    const upgradeContent = div();
    let definitionSignature = null;

    const refreshRows = () => {
        const visibleRows = upgrades.val.filter((upgrade) => matchesSearch(upgrade, searchQuery.val));
        upgradeRows.replaceChildren(...visibleRows.map((upgrade) => rowNodes.get(upgrade.index)));
        upgradeContent.replaceChildren(upgrades.val.length ? upgradeRows : noUpgrades);
    };

    const rebuildRows = (nextUpgrades) => {
        const nextSignature = nextUpgrades
            .map((upgrade) => `${upgrade.index}:${upgrade.name}:${upgrade.maxLevel}`)
            .join("|");
        if (definitionSignature === nextSignature) return;

        definitionSignature = nextSignature;
        rowNodes.clear();
        nextUpgrades.forEach((upgrade) => {
            rowNodes.set(
                upgrade.index,
                UpgradeRow({
                    system: title,
                    levelsPath,
                    upgrade,
                    levelState: getOrCreateState(levelStates, upgrade.index),
                    deleteCachePaths,
                })
            );
        });
    };

    van.derive(() => {
        upgrades.val;
        searchQuery.val;
        refreshRows();
    });

    const load = () =>
        runLoad(async () => {
            const [rawLevels, definitionTable, rawCurrencyValues, rawOrder] = await Promise.all([
                gga(levelsPath),
                staticUpgrades?.length ? Promise.resolve({ path: null, rows: [] }) : readFirstDefinitionTable(definitionPaths),
                Promise.all(allCurrencyFields.map((field) => gga(fieldPath(field)))),
                orderPath ? readCList(orderPath) : Promise.resolve(null),
            ]);
            const levels = toIndexedArray(rawLevels ?? []);
            const nextUpgrades = staticUpgrades?.length
                ? buildStaticUpgrades(staticUpgrades)
                : buildUpgrades({
                      levels,
                      definitions: definitionTable.rows,
                      order: rawOrder,
                      fallbackPrefix,
                      fallbackMax,
                      getStorageIndex,
                      preferDefinitionCount,
                      maxLevelIndex,
                  });

            rebuildRows(nextUpgrades);
            nextUpgrades.forEach((upgrade) => {
                getOrCreateState(levelStates, upgrade.index).val = Math.min(
                    upgrade.maxLevel,
                    toInt(levels[upgrade.storageIndex], { min: 0 })
                );
            });
            allCurrencyFields.forEach((field, index) => {
                getOrCreateState(currencyStates, field.key).val = toNum(rawCurrencyValues[index], 0);
            });
            upgrades.val = nextUpgrades;
        });

    const runBulkAction = async (mode) => {
        const currentUpgrades = upgrades.val;
        if (!currentUpgrades.length || bulkStatus.val === "loading") return;

        const result = await runBulk(async () => {
            try {
                await runBulkSet({
                    entries: currentUpgrades,
                    getTargetValue: (upgrade) => (mode === "max" ? upgrade.maxLevel : 0),
                    getValueState: (upgrade) => getOrCreateState(levelStates, upgrade.index),
                    getPath: (upgrade) => `${levelsPath}[${upgrade.storageIndex}]`,
                });
            } finally {
                for (const cachePath of deleteCachePaths) {
                    await deleteGga(cachePath);
                }
            }
        });

        if (!result.ok) await load();
    };

    load();

    const subNav = div(
        { class: "control-bar sticky-header masterclass-upgrade-controls" },
        SearchBar({
            placeholder: `SEARCH ${title} OR INDEX`,
            value: searchQuery,
            debounceMs: 0,
            onInput: (value) => (searchQuery.val = value),
        })
    );

    return PersistentAccountListPage({
        title,
        description,
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    disabled: () => loading.val || bulkStatus.val === "loading",
                    tooltip: `Set every ${title} upgrade to its defined maximum level.`,
                    onClick: () => runBulkAction("max"),
                },
                {
                    label: "RESET ALL",
                    status: bulkStatus,
                    variant: "danger",
                    disabled: () => loading.val || bulkStatus.val === "loading",
                    tooltip: `Reset every ${title} upgrade to level 0.`,
                    onClick: () => runBulkAction("reset"),
                },
            ],
            refresh: {
                onClick: load,
                tooltip: `Re-read ${title} levels and definitions from the running game.`,
                disabled: () => loading.val || bulkStatus.val === "loading",
            },
        }),
        state: { loading, error },
        subNav,
        loadingText: `READING ${title}`,
        errorTitle: `${title} READ FAILED`,
        initialWrapperClass: "masterclass-upgrade-scroll",
        body: div(
            { class: "masterclass-upgrade-scroll scrollable-panel" },
            allCurrencyFields.length
                ? CurrencySection({
                      title: currencyTitle ?? `${title} CURRENCY`,
                      fields: currencyFields,
                      states: currencyStates,
                      tabs: currencyTabs,
                      activeTab: activeCurrencyTab,
                  })
                : null,
            upgradeContent
        ),
    });
};
