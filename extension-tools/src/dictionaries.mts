/**
 * The `cspell-ext.json` of the packages an extension imports: the dictionaries and the settings that turn them on.
 */

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { parse as parseJsonc } from 'jsonc-parser';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { extensionRepoPath } from './repo.mts';

/** The parts of a `cspell-ext.json` the tools read. */
export interface DictionaryExt {
    engines?: Record<string, string>;
    /** Not followed. The table stops on a package that imports others; see `importedRows` in the sync. */
    import?: string[];
    dictionaryDefinitions?: DictionaryDefinition[];
    dictionaries?: string[];
    languageSettings?: LanguageSetting[];
    overrides?: Override[];
}

export interface DictionaryDefinition {
    name: string;
}

export interface LanguageSetting {
    // cspell takes a comma-separated list or an array.
    languageId?: string | string[];
    locale?: string | string[];
    /** The deprecated spelling of `locale`. */
    local?: string | string[];
    dictionaries?: string[];
}

export interface Override {
    filename: string | string[];
    /** Sets the file type of the matching files. It doesn't select them. */
    languageId?: string | string[];
    /** Sets the locale of the matching files. It doesn't select them. */
    language?: string;
    dictionaries?: string[];
}

/** A `cspell-ext.json` and where it comes from. */
export interface Source {
    /** The import, e.g. `@cspell/dict-sv/cspell-ext.json`, or `extension.config.json` for the extension's `cspell`. */
    name: string;
    ext: DictionaryExt;
}

/** The `cspell-ext.json` of each package in `cspell.import`, read from the extension's `node_modules`. */
export async function readDictionaries(extensionDir: string, config: ExtensionConfig): Promise<DictionaryExt[]> {
    return (await readImports(extensionDir, config)).map((source) => source.ext);
}

/** The `cspell-ext.json` of each package in `cspell.import`, with the import it comes from. */
export async function readImports(extensionDir: string, config: ExtensionConfig): Promise<Source[]> {
    const imports = (config.cspell as { import?: string[] }).import ?? [];
    const require = createRequire(path.join(extensionDir, 'package.json'));
    const sources: Source[] = [];
    for (const spec of imports.filter((spec) => !spec.startsWith('.'))) {
        let file: string;
        try {
            file = require.resolve(spec);
        } catch {
            throw new Error(`${extensionRepoPath(extensionDir)}: can't find "${spec}". Run \`npm install\` first.`);
        }
        // A dictionary's cspell-ext.json may have comments.
        sources.push({ name: spec, ext: parseJsonc(await fs.readFile(file, 'utf8')) as DictionaryExt });
    }
    return sources;
}

/** The items of a setting cspell reads as a list: an array, or a comma-separated string. */
export function splitList(list: string | string[] | undefined): string[] {
    return [list ?? '']
        .flat()
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
}
