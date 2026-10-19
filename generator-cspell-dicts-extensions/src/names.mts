/**
 * Make a directory name: lowercase letters, digits and `-`.
 */
export function normalizeName(name: string): string {
    return name
        .normalize('NFD')
        .replaceAll(/\p{M}/gu, '')
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
}

/**
 * Derive an extension name from a package description.
 *
 * - `Swedish dictionary for CSpell.` -> `swedish`
 * - `Medical Terms dictionary for cspell.` -> `medical-terms`
 */
export function nameFromDescription(description: string): string {
    const subject = description
        .replace(/^(an?|the)\s+/i, '')
        .replace(/\s*(?:\blanguage\s+)?\b(?:dictionary|dictionaries)\b.*$/i, '');
    return normalizeName(subject);
}

/**
 * Derive an extension name from a parser package name. The descriptions of the per-language parsers all read alike,
 * so the package name is what tells them apart.
 *
 * - `@cspell/parser-typescript` -> `typescript-parser`
 * - `@cspell/parser-python-strings-comments` -> `python-strings-comments-parser`
 */
export function nameFromParserPackage(packageName: string): string {
    const subject = normalizeName(packageName.replace(/^@cspell\/parser-/, ''));
    return subject ? `${subject}-parser` : '';
}

export function toFriendlyName(name: string): string {
    return name.split('-').filter(Boolean).map(title).join(' ');
}

export function title(s: string): string {
    return s.slice(0, 1).toUpperCase() + s.slice(1);
}
