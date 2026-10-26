// cspell:ignore exintro explaintext langlinks lllang pageprops ppprop

/**
 * Fetch a sample text from Wikipedia: the lead section of an article in a language.
 */

import { document, heading, link, paragraph } from 'inject-markdown/markdown';
import type { MDLink } from 'inject-markdown/markdown';

export const wikipediaLicense: MDLink = link('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/');

/** Fetch JSON. Rejects on a network error or an HTTP error status. */
export type GetJson = (url: string) => Promise<unknown>;

export interface Article {
    /** The title in the article's language, i.e. `Seattle, Washington` in Scottish Gaelic. */
    title: string;
    url: string;
    /** The lead section as plain text, with a blank line between paragraphs. */
    text: string;
}

/**
 * The lead section of the Wikipedia article with this title, in a language, i.e. `th` for Thai. The title is looked up
 * in that language, then as an English title whose article in that language is used, so `Seattle` finds `Seattle, Washington` in Scottish Gaelic.
 * @returns undefined when there's no such article, or for a disambiguation page.
 */
export async function fetchArticle(
    language: string,
    title: string,
    getJson: GetJson = fetchJson,
): Promise<Article | undefined> {
    const found =
        (await leadSection(language, title, getJson)) ??
        (language === 'en' ? undefined : await translated(language, title, getJson));
    if (!found) return undefined;
    const url = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(found.title.replaceAll(' ', '_'))}`;
    return { title: found.title, url, text: found.extract.split(/\n+/).join('\n\n') };
}

/** An article as a Markdown sample, with its source and license at the end. */
export function articleMarkdown(article: Article): string {
    return document(
        heading(1, article.title),
        article.text.split('\n\n').map((text) => paragraph(text)),
        paragraph('Source: ', link(`Wikipedia: ${article.title}`, article.url), ', ', wikipediaLicense),
    ).toString();
}

interface Found {
    title: string;
    extract: string;
}

async function translated(language: string, englishTitle: string, getJson: GetJson): Promise<Found | undefined> {
    const query = `prop=langlinks&redirects=1&titles=${encodeURIComponent(englishTitle)}&lllang=${encodeURIComponent(language)}`;
    const title = ((await getJson(api('en', query))) as Pages).query?.pages?.[0]?.langlinks?.[0]?.title;
    return title ? leadSection(language, title, getJson) : undefined;
}

async function leadSection(language: string, title: string, getJson: GetJson): Promise<Found | undefined> {
    const query = `prop=extracts|pageprops&ppprop=disambiguation&explaintext=1&exintro=1&redirects=1&titles=${encodeURIComponent(title)}`;
    const page = ((await getJson(api(language, query))) as Pages).query?.pages?.[0];
    const extract = page?.extract?.trim();
    if (!extract || page?.pageprops?.disambiguation !== undefined) return undefined;
    return { title: page?.title ?? title, extract };
}

function api(language: string, query: string): string {
    return `https://${language}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&${query}`;
}

interface Pages {
    query?: {
        pages?: {
            title?: string;
            extract?: string;
            pageprops?: { disambiguation?: string };
            langlinks?: { title?: string }[];
        }[];
    };
}

/** Wikipedia asks API clients to identify themselves. */
const userAgent = 'vscode-cspell-dict-extensions (https://github.com/streetsidesoftware/vscode-cspell-dict-extensions)';

export async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(15_000),
    }).catch((e: unknown) => {
        throw new Error(`Could not reach ${new URL(url).host}: ${e instanceof Error ? e.message : String(e)}`);
    });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response.json();
}
