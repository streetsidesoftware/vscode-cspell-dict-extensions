#!/usr/bin/env node

/**
 * List the packages an extension can include: the dictionaries in cspell-dicts and the parsers in cspell-parsers.
 *
 * Usage: `npm run list:packages -- [words…] [--missing] [--json]`
 * - `words`: only the packages whose name, English name or description contains every word, i.e. `thai`.
 * - `--missing`: only the packages no extension includes yet, leaving out those that ship with cspell.
 * - `--json`: print JSON instead of a table.
 */

import { parseArgs } from 'node:util';

import { type CSpellPackage, fetchCSpellPackages, filterPackages } from './lib/cspellPackages.mts';
import { findExistingExtensions } from './lib/existingExtensions.mts';
import { extensionsDir } from './lib/repo.mts';

export interface ListedPackage extends CSpellPackage {
    /** The extension that includes the package, i.e. `swedish`, or `ships with cspell`. Empty when there is none. */
    extension: string;
}

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { missing: { type: 'boolean' }, json: { type: 'boolean' } },
    });
    const existing = await findExistingExtensions(extensionsDir);
    const listed: ListedPackage[] = filterPackages(await fetchCSpellPackages(), positionals)
        .map((pkg) => ({
            ...pkg,
            extension: existing.get(pkg.packageName) ?? (pkg.withCSpell ? 'ships with cspell' : ''),
        }))
        .filter((pkg) => !values.missing || !pkg.extension);

    if (values.json) {
        console.log(JSON.stringify(listed, null, 2));
        return;
    }
    const rows = listed.map((pkg) => [
        pkg.packageName,
        pkg.name,
        pkg.kind,
        // The list doesn't say whether a dictionary without file types is on for every file or off until turned on.
        (pkg.locales.length ? pkg.locales : pkg.fileTypes).join(', '),
        pkg.extension,
    ]);
    printTable(['Package', 'Name', 'Kind', 'Locales / file types', 'Extension'], rows);
    console.log(`\n${listed.length} package${listed.length === 1 ? '' : 's'}.`);
}

function printTable(header: string[], rows: string[][]): void {
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]?.length ?? 0)));
    const line = (cells: string[]) =>
        cells
            .map((cell, i) => cell.padEnd(widths[i] ?? 0))
            .join('  ')
            .trimEnd();
    console.log(line(header));
    console.log(line(widths.map((w) => '-'.repeat(w))));
    for (const row of rows) console.log(line(row));
}

try {
    await run();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
}
