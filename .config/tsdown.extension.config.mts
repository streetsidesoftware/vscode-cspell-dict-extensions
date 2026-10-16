import { defineConfig } from 'tsdown';

/**
 * Shared base for each extension's `tsdown.config.ts`, which `npm run sync:extensions` writes.
 *
 * Bundles `src/extension.ts`, the shared runtime in `extension-runtime/`, and `extension.config.json` into one
 * ESM file. `vscode` is provided by the extension host. The dictionary packages are not bundled: `cspell-ext.json`
 * imports them from `node_modules` at run time.
 */
export default defineConfig({
    entry: ['src/extension.ts'],
    outDir: 'out',
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    dts: false,
    sourcemap: true,
    clean: true,
    // A single ESM format with "type": "module" makes a plain .js unambiguous.
    fixedExtension: false,
    deps: {
        neverBundle: ['vscode'],
    },
});
