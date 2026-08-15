export const THEME_STORAGE_KEY = "uiTheme";
export const THEMES = ["system", "light", "dark"];

export const normalizeTheme = (theme) => (THEMES.includes(theme) ? theme : "light");

export const loadThemePreference = (storage = localStorage) => normalizeTheme(storage.getItem(THEME_STORAGE_KEY));

export const applyTheme = (theme, root = document.documentElement) => {
    const normalizedTheme = normalizeTheme(theme);
    root.dataset.theme = normalizedTheme;
    return normalizedTheme;
};

export const saveThemePreference = (theme, storage = localStorage, root = document.documentElement) => {
    const normalizedTheme = applyTheme(theme, root);
    storage.setItem(THEME_STORAGE_KEY, normalizedTheme);
    return normalizedTheme;
};
