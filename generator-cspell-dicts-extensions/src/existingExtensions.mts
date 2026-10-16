import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const regExpCSpellPackage = /@cspell\/(?:dict|parser)-[\w.-]+/g;

/**
 * Find the `@cspell/*` packages that already have an extension, from each `extensions/<name>/cspell-ext.json`.
 * @returns a map from package name to extension directory name.
 */
export async function findExistingExtensions(extensionsDir: string): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    const dirs = await readdir(extensionsDir, { withFileTypes: true }).catch(() => []);
    for (const dir of dirs) {
        if (!dir.isDirectory()) continue;
        const config = await readFile(path.join(extensionsDir, dir.name, 'cspell-ext.json'), 'utf8').catch(() => '');
        for (const [pkg] of config.matchAll(regExpCSpellPackage)) {
            if (!found.has(pkg)) found.set(pkg, dir.name);
        }
    }
    return found;
}
