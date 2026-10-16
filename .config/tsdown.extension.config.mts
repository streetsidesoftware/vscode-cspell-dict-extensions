import { existsSync } from 'node:fs';
import path from 'node:path';

import { defineConfig, type UserConfig } from 'tsdown';

const runtimeSrc = path.resolve(import.meta.dirname, '../extension-runtime/src');

/**
 * The tsdown config of a synced extension. Each extension's `tsdown.config.ts`, written by
 * `npm run sync:extensions`, calls this with its own directory.
 *
 * Bundles the shared entry `extension-runtime/src/entry.ts` into `out/extension.js`, with the extension's
 * `extension.config.json` and optional `src/custom.ts` resolved through aliases. `vscode` is provided by the
 * extension host. The dictionary packages are not bundled: `static/cspell-ext.json` imports them from
 * `node_modules` at run time.
 * @param extensionDir - the extension's directory.
 */
export function extensionConfig(extensionDir: string): UserConfig {
    const custom = path.join(extensionDir, 'src/custom.ts');
    return defineConfig({
        cwd: extensionDir,
        entry: { extension: path.join(runtimeSrc, 'entry.ts') },
        alias: {
            'extension-config': path.join(extensionDir, 'extension.config.json'),
            'extension-custom': existsSync(custom) ? custom : path.join(runtimeSrc, 'noCustom.ts'),
        },
        outDir: path.join(extensionDir, 'out'),
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
}
