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

export function toFriendlyName(name: string): string {
    return name.split('-').filter(Boolean).map(title).join(' ');
}

export function title(s: string): string {
    return s.slice(0, 1).toUpperCase() + s.slice(1);
}
