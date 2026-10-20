/**
 * The packages an extension can wrap: the dictionaries in cspell-dicts and the parsers in cspell-parsers, read from
 * the lists those repositories publish on GitHub.
 */

export const dictionaryPackagesUrl =
    'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/main/static/dictionary-packages.json';
export const parserPackagesUrl =
    'https://raw.githubusercontent.com/streetsidesoftware/cspell-parsers/main/static/packages.csv';

/** The kind of extension a package makes, as in `extension.config.json`. */
export type PackageKind = 'language' | 'wordList' | 'bundle' | 'parser';

export interface CSpellPackage {
    /** The npm package, i.e. `@cspell/dict-th-th`. */
    packageName: string;
    /** The name in English, i.e. `Thai Language`. */
    name: string;
    description: string;
    kind: PackageKind;
    /** The locales that turn a natural language on, i.e. `['th', 'th-th']`. */
    locales: string[];
    /** The file types it is for. Empty when it is for every file type. */
    fileTypes: string[];
    /** It ships with cspell, so it needs no extension. */
    withCSpell: boolean;
}

/** Fetch a URL as text. Rejects on a network error or an HTTP error status. */
export type FetchText = (url: string) => Promise<string>;

export const fetchText: FetchText = async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response.text();
};

/** The parts of an entry in cspell-dicts' `static/dictionary-packages.json` used here. */
interface DictionaryPackageEntry {
    name: string;
    packageName: string;
    description?: string;
    /** True when the package ships with cspell. */
    cspell?: boolean;
    categories?: string[];
    isBundle?: boolean;
    dictionaries?: { locales?: string[]; fileTypes?: string[] }[];
}

/** Every dictionary and parser package, sorted by package name. */
export async function fetchCSpellPackages(fetch: FetchText = fetchText): Promise<CSpellPackage[]> {
    const [dictionaries, parsers] = await Promise.all([fetch(dictionaryPackagesUrl), fetch(parserPackagesUrl)]);
    return [...parseDictionaryPackages(dictionaries), ...parseParserPackages(parsers)].sort((a, b) =>
        a.packageName.localeCompare(b.packageName),
    );
}

export function parseDictionaryPackages(json: string): CSpellPackage[] {
    return (JSON.parse(json) as DictionaryPackageEntry[]).map((entry) => {
        const kind: PackageKind = entry.isBundle
            ? 'bundle'
            : entry.categories?.includes('natural-language')
              ? 'language'
              : 'wordList';
        const dictionaries = entry.dictionaries ?? [];
        return {
            packageName: entry.packageName,
            name: entry.name,
            description: entry.description ?? '',
            kind,
            locales: kind === 'language' ? unique(dictionaries.flatMap((d) => d.locales ?? [])) : [],
            fileTypes: unique(dictionaries.flatMap((d) => d.fileTypes ?? [])),
            withCSpell: entry.cspell === true,
        };
    });
}

/**
 * Read cspell-parsers' `static/packages.csv`, written for a Markdown table:
 * ``[`@cspell/parser-go-strings-comments`](../packages/…),`go`,"`comment`, `string`"``.
 */
export function parseParserPackages(csv: string): CSpellPackage[] {
    const [, ...rows] = csv.trim().split(/\r?\n/).map(parseCsvLine);
    return rows.flatMap(([pkg = '', languages = '']) => {
        const packageName = codeSpans(pkg)[0];
        if (!packageName) return [];
        const fileTypes = codeSpans(languages);
        return [
            {
                packageName,
                name: packageName.replace('@cspell/parser-', ''),
                description: `Parser for ${fileTypes.join(', ')}.`,
                kind: 'parser' as const,
                locales: [],
                fileTypes,
                withCSpell: false,
            },
        ];
    });
}

function parseCsvLine(line: string): string[] {
    return [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)]
        .map((m) => m[1] ?? '')
        .slice(0, -1)
        .map((cell) => (cell.startsWith('"') ? cell.slice(1, -1).replaceAll('""', '"') : cell));
}

function codeSpans(text: string): string[] {
    return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '');
}

/**
 * The packages that match every word, in the package name, name or description, ignoring case.
 */
export function filterPackages(packages: readonly CSpellPackage[], words: readonly string[]): CSpellPackage[] {
    const terms = words.flatMap((w) => w.toLowerCase().split(/\s+/)).filter(Boolean);
    return packages.filter((pkg) => {
        const text = `${pkg.packageName} ${pkg.name} ${pkg.description}`.toLowerCase();
        return terms.every((term) => text.includes(term));
    });
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}
