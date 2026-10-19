/**
 * A locale as a BCP 47 tag, i.e. `sv_SE` -> `sv-SE`. A locale that isn't valid BCP 47, i.e. `fr-90`, is kept as
 * written, with `_` replaced by `-`.
 */
export function canonicalLocale(locale: string): string {
    const tag = locale.trim().replaceAll('_', '-');
    try {
        return Intl.getCanonicalLocales(tag)[0] ?? tag;
    } catch {
        return tag;
    }
}

/** The language part of a locale, i.e. `sv` for `sv-SE`. */
export function languageOf(locale: string): string {
    return locale.split('-')[0] ?? locale;
}

/**
 * The English name of a locale, i.e. `Serbian (Cyrillic)` for `sr-Cyrl`.
 * @returns `undefined` when `Intl` doesn't know the locale.
 */
export function englishLanguageName(locale: string): string | undefined {
    try {
        const name = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'none' }).of(locale);
        return name && name !== locale ? name : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The name of a language in the language itself, i.e. `svenska` for `sv`.
 * @returns `undefined` when `Intl` doesn't know the language.
 */
export function nativeLanguageName(language: string): string | undefined {
    try {
        const name = new Intl.DisplayNames([language], { type: 'language', fallback: 'none' }).of(language);
        return name && name !== language ? name : undefined;
    } catch {
        return undefined;
    }
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
