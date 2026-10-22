/**
 * The cspell config an extension ships, read by cspell-lib: the config's own `cspell` and every file it imports, with
 * their imports. The dictionaries and the settings that turn them on.
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { extractImportErrors, getSources, resolveConfigFileImports } from 'cspell-lib';
import type { CSpellSettings, LanguageSetting as CSpellLanguageSetting, OverrideSettings } from 'cspell-lib';

import type { CSpellExtPath, ExtensionConfig } from '../../extension-runtime/api.ts';
import { extensionRepoPath, repoRoot } from './repo.mts';

/** The parts of a cspell config file the tools read. */
export type DictionaryExt = Pick<
    CSpellSettings,
    'engines' | 'dictionaryDefinitions' | 'dictionaries' | 'languageSettings' | 'overrides'
>;
export type LanguageSetting = CSpellLanguageSetting;
export type Override = OverrideSettings;

/** One config file cspell reads for the extension. */
export interface Source {
    /** The file as a repo path, or `extension.config.json` for the config's own `cspell`. */
    name: string;
    /** The package the file is in, e.g. `@cspell/dict-sv`, and its folder; `undefined` for the config's own `cspell`. */
    package: { name: string; dir: string } | undefined;
    /** The file's own settings, without its imports. */
    ext: DictionaryExt;
}

const cspellExtPath: CSpellExtPath = 'static/cspell-ext.json';

/**
 * Every config file cspell reads for the extension, in cspell's order: the imported files, each after the files it
 * imports, then the config's own `cspell` last. It reads the config in memory: nothing needs to be written first.
 */
export async function readSources(extensionDir: string, config: ExtensionConfig): Promise<Source[]> {
    // Where the extension's config ends up; cspell-lib resolves the imports from there.
    const url = pathToFileURL(path.join(extensionDir, cspellExtPath));
    const settings = await resolveConfigFileImports({ url, settings: config.cspell as CSpellSettings });
    const errors = extractImportErrors(settings);
    if (errors.length) {
        const lines = errors.map((e) => `  ${e.filename}: ${e.error.message}`);
        throw new Error(
            `${extensionRepoPath(extensionDir)}: can't read an import. Run \`npm install\` first.\n${lines.join('\n')}`,
        );
    }
    return getSources(settings).map((source) => {
        // The config in memory is the one source without a file.
        const file = source.source?.filename;
        if (!file) return { name: 'extension.config.json', package: undefined, ext: source };
        return { name: path.relative(repoRoot, file), package: packageOf(file), ext: source };
    });
}

/** The imported files only, without the config's own `cspell`. */
export async function readImports(extensionDir: string, config: ExtensionConfig): Promise<Source[]> {
    return (await readSources(extensionDir, config)).filter((source) => source.name !== 'extension.config.json');
}

/** The package a file in `node_modules` is in: `…/node_modules/@cspell/dict-sv/cspell-ext.json` is `@cspell/dict-sv`. */
function packageOf(file: string): { name: string; dir: string } | undefined {
    const parts = file.split(path.sep);
    const at = parts.lastIndexOf('node_modules');
    if (at < 0) return undefined;
    const end = at + (parts[at + 1]?.startsWith('@') ? 3 : 2);
    return { name: parts.slice(at + 1, end).join('/'), dir: parts.slice(0, end).join(path.sep) };
}

/** The items of a setting cspell reads as a list: an array, or a comma-separated string. */
export function splitList(list: string | string[] | undefined): string[] {
    return [list ?? '']
        .flat()
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
}
