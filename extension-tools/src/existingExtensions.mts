import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { hasConfig, readConfig } from './config/extensionConfig.mts';

const regExpCSpellPackage = /@cspell\/(?:dict|parser)-[\w.-]+/g;

/**
 * Find the `@cspell/*` packages that already have an extension, from `cspell.import` in each
 * `extensions/<name>/extension.config.json`.
 * @returns a map from package name to extension directory name.
 */
export async function findExistingExtensions(extensionsDir: string): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    const dirs = await readdir(extensionsDir, { withFileTypes: true }).catch(() => []);
    for (const dir of dirs) {
        const extensionDir = path.join(extensionsDir, dir.name);
        if (!dir.isDirectory() || !(await hasConfig(extensionDir))) continue;
        const imports = ((await readConfig(extensionDir)).cspell as { import?: string[] }).import ?? [];
        for (const [pkg] of imports.join('\n').matchAll(regExpCSpellPackage)) {
            if (!found.has(pkg)) found.set(pkg, dir.name);
        }
    }
    return found;
}
