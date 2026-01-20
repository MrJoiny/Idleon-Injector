import js from "@eslint/js";
import globals from "globals";

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
    "eqeqeq": "warn",
    "no-var": "warn",
    "prefer-const": "warn",
};

export default [
    {
        ignores: [
            "node_modules/**",
            "zips/**",
            "idleon-web-profile/**",
            "logs/**",
            "cheats.js",
            "config.custom.js",
            "src/ui/van-*.js",
            "src/ui/van-x-*.js",
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
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ["src/modules/**/*.js", "src/main.js", "config.js", "config.custom.example.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ["config.js", "config.custom.example.js"],
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
        files: ["*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
    },
];

