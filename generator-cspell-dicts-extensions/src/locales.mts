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
