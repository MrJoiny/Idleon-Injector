import js from "@eslint/js";
import globals from "globals";
import noStaticInlineStyles from "./scripts/eslint/no-static-inline-styles.mjs";

const commonRules = {
    // Possible errors
    "no-unused-vars": [
        "warn",
        {
            argsIgnorePattern: "^_|^params$",
            varsIgnorePattern: "^_",
        },
    ],
    "no-undef": "error",
    "no-prototype-builtins": "off", // Safe to use in controlled environments

    // Best practices
    "dot-notation": "warn",
    eqeqeq: "warn",
    "no-var": "warn",
    "prefer-const": "warn",
};

export default [
    {
        ignores: [
            "node_modules/**",
            "zips/**",
            ".scratch/**",
            "idleon-web-profile/**",
            "logs/**",
            "cheats.js",
            "config.custom.js",
            "src/ui/vendor/van-*.js",
            "src/ui/vendor/van-x-*.js",
        ],
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,mjs}"],
        rules: commonRules,
    },
    {
        files: ["src/cheats/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ["src/ui/**/*.js"],
        plugins: { ui: { rules: { "no-static-inline-styles": noStaticInlineStyles } } },
        rules: { "ui/no-static-inline-styles": "error" },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ["src/modules/**/*.js", "src/main.js", "config.js", ".agents/skills/idleon-live-cdp/scripts/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ["config.js"],
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_|^params$|^t$",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        files: ["*.mjs", "scripts/**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
    },
];
