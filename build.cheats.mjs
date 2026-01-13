/**
 * Cheats Build Script
 *
 * Bundles src/cheats/ modules into a single cheats.js file using esbuild.
 * The output is an IIFE that runs in the browser context.
 *
 * Usage:
 *   npm run build:cheats       - Build once
 *   npm run watch:cheats       - Watch mode (rebuild on changes)
 */

import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

const isWatch = process.argv.includes("--watch");

// Section banner plugin - adds readable section comments to output
const sectionBannerPlugin = {
    name: "section-banner",
    setup(build) {
        build.onEnd((result) => {
            if (result.errors.length > 0) return;

            const outfile = build.initialOptions.outfile;
            if (!outfile || !fs.existsSync(outfile)) return;

            let content = fs.readFileSync(outfile, "utf8");

            // Add section markers for key parts (these patterns match esbuild's bundled output)
            const sectionMarkers = [
                { pattern: /\/\/ src\/cheats\/constants\//g, banner: "\n// ============================================================================\n// SECTION: Constants\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/utils\//g, banner: "\n// ============================================================================\n// SECTION: Utilities\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/core\//g, banner: "\n// ============================================================================\n// SECTION: Core\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/proxies\//g, banner: "\n// ============================================================================\n// SECTION: Proxies\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/cheats\//g, banner: "\n// ============================================================================\n// SECTION: Cheat Commands\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/ui\//g, banner: "\n// ============================================================================\n// SECTION: UI\n// ============================================================================\n" },
                { pattern: /\/\/ src\/cheats\/api\//g, banner: "\n// ============================================================================\n// SECTION: API\n// ============================================================================\n" },
            ];

            // Track which sections we've already added to avoid duplicates
            const addedSections = new Set();

            for (const { pattern, banner } of sectionMarkers) {
                const sectionName = banner.match(/SECTION: (.+)/)?.[1];
                if (sectionName && !addedSections.has(sectionName)) {
                    const match = content.match(pattern);
                    if (match) {
                        // Only add banner before the first occurrence
                        content = content.replace(pattern, (m) => {
                            if (addedSections.has(sectionName)) return m;
                            addedSections.add(sectionName);
                            return banner + m;
                        });
                    }
                }
            }

            fs.writeFileSync(outfile, content);
        });
    },
};

// Get package version for banner
let version = "dev";
try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    version = pkg.version || "dev";
} catch {
    // Ignore errors
}

const buildOptions = {
    entryPoints: ["src/cheats/index.js"],
    bundle: true,
    outfile: "cheats.js",
    format: "iife",
    target: "es2020",
    minify: false,
    keepNames: true,
    sourcemap: false,
    logLevel: "info",
    banner: {
        js: `/*
 * Idleon Injector - Cheats Module v${version}
 * Auto-generated from src/cheats/ - ${new Date().toISOString().split("T")[0]}
 *
 * For config changes: edit config.custom.js
 * To modify cheats: edit source files in src/cheats/ and run:
 *   npm run build:cheats
 *
 * This file CAN be edited directly, but changes will be lost on rebuild.
 * The source of truth is in src/cheats/
 */
`,
    },
    plugins: [sectionBannerPlugin],
};

async function build() {
    try {
        if (isWatch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log("Watching for changes...");
        } else {
            const result = await esbuild.build(buildOptions);
            const stats = fs.statSync("cheats.js");
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`\u2713 cheats.js built successfully (${sizeKB} KB)`);
        }
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

build();
