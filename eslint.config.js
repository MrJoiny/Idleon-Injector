import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["src/cheats/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            // Possible errors
            "no-unused-vars": ["warn", { 
                argsIgnorePattern: "^_|^params$",
                varsIgnorePattern: "^_"
            }],
            "no-undef": "error",
            
            // Best practices
            "dot-notation": "warn",
            "eqeqeq": "warn",
            "no-var": "warn",
            "prefer-const": "warn",
        },
    },
];
