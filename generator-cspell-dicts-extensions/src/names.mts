/**
 * Make a directory name: lowercase letters, digits and `-`.
 */
export function normalizeName(name: string): string {
    return name
        .normalize('NFD')
        .replaceAll(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+|-+$/g, '');
}

/**
 * Derive an extension name from a package description.
 *
 * - `Swedish dictionary for CSpell.` -> `swedish`
 * - `Medical Terms dictionary for cspell.` -> `medical-terms`
 * - `A TypeScript parser plugin for cspell.` -> `typescript-parser`
 */
export function nameFromDescription(description: string): string {
    const subject = description
        .replace(/^(an?|the)\s+/i, '')
        .replace(/\s*(\blanguage\s+)?\bdictionar(y|ies)\b.*$/i, '')
        .replace(/\s*\bplugin\b.*$/i, '');
    return normalizeName(subject);
}

export function toFriendlyName(name: string): string {
    return name.split('-').filter(Boolean).map(title).join(' ');
}

export function title(s: string): string {
    return s.slice(0, 1).toUpperCase() + s.slice(1);
}
