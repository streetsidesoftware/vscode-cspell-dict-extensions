/**
 * Drift: what an extension's config says that its installed packages, and its own `cspell`, no longer back up.
 */

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { readDictionaries } from './dictionaries.mts';
import type { DictionaryExt } from './dictionaries.mts';

/**
 * The commands for a dictionary nothing defines, and the locales no language setting declares: in a command and in
 * `locale`. "Nothing" is the installed packages and the config's own `cspell`. cspell's built-in dictionaries don't
 * count: an extension turns on the dictionaries it brings.
 * @returns one message for each.
 */
export async function findDrift(extensionDir: string, config: ExtensionConfig): Promise<string[]> {
    const exts = [...(await readDictionaries(extensionDir, config)), config.cspell as DictionaryExt];
    const dictionaries = new Set(exts.flatMap((ext) => (ext.dictionaryDefinitions ?? []).map((d) => d.name)));
    const locales = new Set(exts.flatMap(declaredLocales).map(localeKey));
    const undeclared = (value: string) => localeList(value).filter((locale) => !locales.has(localeKey(locale)));

    const found: string[] = [];
    for (const command of config.commands) {
        if (command.toggle === 'dictionary' && !dictionaries.has(command.value)) {
            found.push(`${command.id} turns "${command.value}" on or off, but nothing defines that dictionary.`);
        }
        if (command.toggle === 'locale') {
            for (const locale of undeclared(command.value)) {
                found.push(`${command.id} turns locale "${locale}" on or off, but no language setting declares it.`);
            }
        }
    }
    if (config.kind === 'language') {
        for (const locale of undeclared(config.locale)) {
            found.push(`"locale" is "${locale}", but no language setting declares it.`);
        }
    }
    return found;
}

/** The locales of a `cspell-ext.json`'s language settings: the only setting that turns a dictionary on by locale. */
function declaredLocales(ext: DictionaryExt): string[] {
    return (ext.languageSettings ?? []).flatMap((setting) => [setting.locale ?? []].flat().flatMap(localeList));
}

/** A list of locales, split as cspell does: on commas, whitespace, `|` and `;`. */
function localeList(locales: string): string[] {
    return locales
        .split(/[\s,|;]+/)
        .map((locale) => locale.trim())
        .filter(Boolean);
}

/** cspell compares locales in lowercase, without the separators: `sv_SE` is `sv-SE`. */
function localeKey(locale: string): string {
    return locale.toLowerCase().replace(/[^a-z]/g, '');
}
