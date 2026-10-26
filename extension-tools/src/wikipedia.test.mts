// cspell:ignore exintro explaintext langlinks lllang pageprops ppprop

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { articleMarkdown, fetchArticle } from './wikipedia.mts';
import type { GetJson } from './wikipedia.mts';

const api = (language: string) =>
    `https://${language}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&`;
const lead = (title: string) =>
    `prop=extracts|pageprops&ppprop=disambiguation&explaintext=1&exintro=1&redirects=1&titles=${encodeURIComponent(title)}`;

function fakeWikipedia(responses: Record<string, unknown>): GetJson & { urls: string[] } {
    const urls: string[] = [];
    const getJson = (url: string) => {
        urls.push(url);
        return Promise.resolve(responses[url] ?? { query: { pages: [{ missing: true }] } });
    };
    return Object.assign(getJson, { urls });
}

describe('fetchArticle', () => {
    it("finds the article by the English title's language link", async () => {
        const getJson = fakeWikipedia({
            [`${api('en')}prop=langlinks&redirects=1&titles=Seattle&lllang=gd`]: {
                query: { pages: [{ langlinks: [{ title: 'Seattle, Washington' }] }] },
            },
            [api('gd') + lead('Seattle, Washington')]: {
                query: { pages: [{ title: 'Seattle, Washington', extract: 'Tha Seattle…\nSecond paragraph.' }] },
            },
        });
        assert.deepEqual(await fetchArticle('gd', 'Seattle', getJson), {
            title: 'Seattle, Washington',
            url: 'https://gd.wikipedia.org/wiki/Seattle%2C_Washington',
            text: 'Tha Seattle…\n\nSecond paragraph.',
        });
    });

    it('skips a disambiguation page, and returns undefined when there is no article', async () => {
        const getJson = fakeWikipedia({
            [api('de') + lead('Argentina')]: {
                query: {
                    pages: [
                        { title: 'Argentina', extract: 'Argentina may refer to…', pageprops: { disambiguation: '' } },
                    ],
                },
            },
        });
        assert.equal(await fetchArticle('de', 'Argentina', getJson), undefined);
        assert.equal(getJson.urls.length, 2);
        assert.equal(await fetchArticle('en', 'Nowhere', fakeWikipedia({})), undefined);
    });
});

describe('articleMarkdown', () => {
    it('ends with the source and license', () => {
        const markdown = articleMarkdown({
            title: 'Seattle',
            url: 'https://en.wikipedia.org/wiki/Seattle',
            text: 'Text.',
        });
        assert.equal(
            markdown,
            '# Seattle\n\nText.\n\nSource: [Wikipedia: Seattle](https://en.wikipedia.org/wiki/Seattle), ' +
                '[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)\n',
        );
    });

    it('escapes Markdown in the plain text of the article', () => {
        const markdown = articleMarkdown({
            title: 'C*',
            url: 'https://en.wikipedia.org/wiki/C*',
            text: '# Not a heading, *not emphasis*.\n\n1. Not a list.',
        });
        assert.match(markdown, /^# C\\\*\n\n\\# Not a heading, \\\*not emphasis\\\*\.\n\n1\\\. Not a list\.\n/);
    });
});
