const THEME_STORAGE_KEY = "uiTheme";
const THEMES = ["system", "light", "dark"];

const normalizeTheme = (theme) => (THEMES.includes(theme) ? theme : "dark");

const applyTheme = (theme, root = document.documentElement) => {
    const normalizedTheme = normalizeTheme(theme);
    root.dataset.theme = normalizedTheme;
    return normalizedTheme;
};

/**
 * Load the saved theme preference from local storage.
 * @param {Storage} [storage=localStorage] - Storage interface
 * @returns {"system"|"light"|"dark"} Normalized theme preference
 */
export const loadThemePreference = (storage = localStorage) => normalizeTheme(storage.getItem(THEME_STORAGE_KEY));

/**
 * Apply and persist the selected interface theme.
 * @param {string} theme - Theme name to persist ("system", "light", "dark")
 * @param {Storage} [storage=localStorage] - Storage interface
 * @param {HTMLElement} [root=document.documentElement] - Root document element
 * @returns {"system"|"light"|"dark"} The applied normalized theme
 */
export const saveThemePreference = (theme, storage = localStorage, root = document.documentElement) => {
    const normalizedTheme = applyTheme(theme, root);
    storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    return normalizedTheme;
};
