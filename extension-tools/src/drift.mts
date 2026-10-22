/**
 * Drift: what an extension's config says that its installed packages no longer back up.
 */

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { type DictionaryExt, readDictionaries, splitList } from './dictionaries.mts';

/**
 * The commands for a dictionary no package defines, and the locales no package declares: in a command and in `locale`.
 * @returns one message for each.
 */
export async function findDrift(extensionDir: string, config: ExtensionConfig): Promise<string[]> {
    const exts = [...(await readDictionaries(extensionDir, config)), config.cspell as DictionaryExt];
    const dictionaries = new Set(exts.flatMap((ext) => (ext.dictionaryDefinitions ?? []).map((d) => d.name)));
    const locales = new Set(exts.flatMap(declaredLocales).map(localeKey));
    const undeclared = (value: string) => splitList(value).filter((locale) => !locales.has(localeKey(locale)));

    const found: string[] = [];
    for (const command of config.commands) {
        if (command.toggle === 'dictionary' && !dictionaries.has(command.value)) {
            found.push(`${command.id} turns "${command.value}" on or off, but no package defines that dictionary.`);
        }
        if (command.toggle === 'locale') {
            for (const locale of undeclared(command.value)) {
                found.push(`${command.id} turns locale "${locale}" on or off, but no package declares it.`);
            }
        }
    }
    for (const locale of undeclared(config.kind === 'language' ? config.locale : '')) {
        found.push(`"locale" is "${locale}", but no package declares it.`);
    }
    return found;
}

/** The locales in a `cspell-ext.json`: of its language settings and its dictionary definitions. */
function declaredLocales(ext: DictionaryExt): string[] {
    return [
        ...(ext.languageSettings ?? []).flatMap((setting) => splitList(setting.locale)),
        ...(ext.dictionaryDefinitions ?? []).flatMap((definition) => splitList(definition.locale)),
    ];
}

/** cspell compares locales in lowercase, without the separators: `sv_SE` is `sv-SE`. */
function localeKey(locale: string): string {
    return locale.toLowerCase().replace(/[^a-z]/g, '');
}
