import { type CSpellPackage, fetchCSpellPackages, filterPackages } from './cspellPackages.mts';
import { findExistingExtensions } from './existingExtensions.mts';
import { extensionsDir } from './repo.mts';

export interface ListedPackage extends CSpellPackage {
    /** The extension that includes the package, e.g. `swedish`, or `ships with cspell`. Empty when there is none. */
    extension: string;
}

export interface ListOptions {
    /** A package may contain any of the words, instead of every word. */
    any?: boolean | undefined;
    /** Only the packages no extension includes yet, leaving out those that ship with cspell. */
    missing?: boolean | undefined;
}

/**
 * The packages an extension can include: the dictionaries in cspell-dicts and the parsers in cspell-parsers.
 * @param words - only the packages whose name, English name or description contains every word.
 */
export async function listPackages(words: string[], options: ListOptions): Promise<ListedPackage[]> {
    const existing = await findExistingExtensions(extensionsDir);
    return filterPackages(await fetchCSpellPackages(), words, { any: options.any })
        .map((pkg) => ({
            ...pkg,
            extension: existing.get(pkg.packageName) ?? (pkg.withCSpell ? 'ships with cspell' : ''),
        }))
        .filter((pkg) => !options.missing || !pkg.extension);
}

export function packagesTable(listed: ListedPackage[]): string {
    const header = ['Package', 'Name', 'Kind', 'Locales / file types', 'Extension'];
    const rows = listed.map((pkg) => [
        pkg.packageName,
        pkg.name,
        pkg.kind,
        // The list doesn't say whether a dictionary without file types is on for every file or off until turned on.
        (pkg.locales.length ? pkg.locales : pkg.fileTypes).join(', '),
        pkg.extension,
    ]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]?.length ?? 0)));
    const line = (cells: string[]) =>
        cells
            .map((cell, i) => cell.padEnd(widths[i] ?? 0))
            .join('  ')
            .trimEnd();
    return [line(header), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}
