/**
 * Look up `@cspell/*` packages on the npm registry.
 */

import { parseJsonc } from './jsonc.mts';

export interface PackageSummary {
    name: string;
    description: string;
}

/** Fetch JSON. Rejects on a network error or an HTTP error status. */
export type FetchJson = (url: string) => Promise<unknown>;

export class HttpError extends Error {
    readonly status: number;

    constructor(url: string, status: number) {
        super(`${url} returned HTTP ${status}`);
        this.status = status;
    }
}

/** Fetch JSON, allowing comments, since cspell configuration files may have them. */
export const fetchJson: FetchJson = async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new HttpError(url, response.status);
    return parseJsonc(await response.text());
};

const registry = 'https://registry.npmjs.org';

/** Finds every `@cspell/dict-*` and `@cspell/parser-*` package; plain `scope:cspell dict` misses many of them. */
const searchText = 'scope:cspell keywords:cspell';
const pageSize = 250;
const maxPages = 10;

interface SearchResult {
    total: number;
    objects: { package: { name: string; description?: string } }[];
}

/**
 * List the `@cspell/*` packages whose names start with `prefix`, i.e. `@cspell/dict-`.
 */
export async function searchPackages(prefix: string, fetch: FetchJson = fetchJson): Promise<PackageSummary[]> {
    const found = new Map<string, PackageSummary>();
    for (let page = 0; page < maxPages; page++) {
        const from = page * pageSize;
        const url = `${registry}/-/v1/search?text=${encodeURIComponent(searchText)}&size=${pageSize}&from=${from}`;
        const result = (await fetch(url)) as SearchResult;
        for (const { package: pkg } of result.objects) {
            if (!pkg.name.startsWith(prefix)) continue;
            found.set(pkg.name, { name: pkg.name, description: pkg.description ?? '' });
        }
        if (from + pageSize >= result.total) break;
    }
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Look up one package.
 * @returns undefined when the package does not exist.
 */
export async function packageInfo(name: string, fetch: FetchJson = fetchJson): Promise<PackageSummary | undefined> {
    try {
        const pkg = (await fetch(`${registry}/${name.replaceAll('/', '%2f')}`)) as {
            name: string;
            description?: string;
        };
        return { name: pkg.name, description: pkg.description ?? '' };
    } catch (e) {
        if (e instanceof HttpError && e.status === 404) return undefined;
        throw e;
    }
}
