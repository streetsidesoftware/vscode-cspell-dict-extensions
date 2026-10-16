/**
 * Read what a dictionary package's `cspell-ext.json` turns on.
 */

/** The parts of a `cspell-ext.json` that matter here. */
export interface CSpellExt {
    dictionaryDefinitions?: { name?: string }[];
    languageSettings?: { languageId?: string; locale?: string }[];
}

export interface DictionaryInfo {
    /** True when the dictionary is enabled by locale, for all file types. */
    naturalLanguage: boolean;
    /** The locales that enable it, i.e. `['sv', 'sv_SE']`. Empty unless `naturalLanguage`. */
    locales: string[];
    /** The names of the dictionaries the package defines. */
    dictionaries: string[];
}

/**
 * Classify a dictionary package by its `cspell-ext.json`.
 *
 * A natural language dictionary has a `languageSettings` entry for every file type (`languageId: "*"`) with a
 * locale, i.e. `{ "languageId": "*", "locale": "sv,sv_SE" }`. Other dictionaries are enabled by file type, by a
 * top-level `dictionaries` entry, or not at all.
 */
export function classify(cspellExt: CSpellExt): DictionaryInfo {
    const dictionaries = (cspellExt.dictionaryDefinitions ?? []).flatMap((def) => (def.name ? [def.name] : []));
    const setting = (cspellExt.languageSettings ?? []).find(
        (ls) => ls.languageId === '*' && !!ls.locale && ls.locale.trim() !== '*',
    );
    const locales =
        setting?.locale
            ?.split(',')
            .map((locale) => locale.trim())
            .filter(Boolean) ?? [];
    return { naturalLanguage: locales.length > 0, locales, dictionaries };
}

/**
 * The most specific locale: the one with the most parts, the last one on a tie.
 *
 * - `['sv', 'sv_SE']` -> `sv_SE`
 * - `['fr', 'fr-fr', 'fr-90']` -> `fr-90`
 */
export function mostSpecificLocale(locales: readonly string[]): string | undefined {
    let best: string | undefined;
    let bestParts = 0;
    for (const locale of locales) {
        const parts = locale.split(/[-_]/).length;
        if (parts >= bestParts) {
            best = locale;
            bestParts = parts;
        }
    }
    return best;
}

export function cspellExtUrl(packageName: string): string {
    return `https://cdn.jsdelivr.net/npm/${packageName}/cspell-ext.json`;
}
