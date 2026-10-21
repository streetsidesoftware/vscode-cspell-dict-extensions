/**
 * `static/dictionary-types.json`: the category of each extension, which the README's extension lists use as headings.
 * It is generated from each extension's `kind` in `extension.config.json`.
 */

import { type ExtensionKind, listExtensionRepoPaths, readExtensionKind } from '../../extension-tools/api.mts';

import { writeJson } from './repo.mts';

export const dictionaryTypesFile = 'static/dictionary-types.json';

export interface DictionaryTypesConfig {
    /** The extensions in each category, by repo path, i.e. `extensions/swedish`. */
    types: Record<string, string[]>;
    /** The category of an extension without an `extension.config.json`. */
    default: string;
}

/** The category of each kind of extension. */
export const categoryOfKind: Record<ExtensionKind, string> = {
    language: 'Languages',
    wordList: 'Technical Terms',
    bundle: 'Support',
    parser: 'Parsers',
};

export const defaultCategory = 'Other';

/**
 * The categories of the extensions.
 * @param kinds - the `kind` of each extension by repo path; `undefined` without an `extension.config.json`.
 */
export function dictionaryTypes(kinds: ReadonlyMap<string, ExtensionKind | undefined>): DictionaryTypesConfig {
    const types: Record<string, string[]> = {};
    for (const [repoPath, kind] of kinds) {
        if (!kind) continue;
        (types[categoryOfKind[kind]] ??= []).push(repoPath);
    }
    return { types, default: defaultCategory };
}

/** Write `static/dictionary-types.json` from the extensions' configs. */
export async function genDictionaryTypes(): Promise<void> {
    const kinds = new Map<string, ExtensionKind | undefined>();
    for (const repoPath of await listExtensionRepoPaths()) {
        kinds.set(repoPath, await readExtensionKind(repoPath));
    }
    await writeJson(dictionaryTypesFile, dictionaryTypes(kinds));
}
