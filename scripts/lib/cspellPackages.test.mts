import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    dictionaryPackagesUrl,
    fetchCSpellPackages,
    filterPackages,
    parseDictionaryPackages,
    parseParserPackages,
    parserPackagesUrl,
} from './cspellPackages.mts';

const dictionaries = JSON.stringify([
    {
        name: 'Thai Language',
        packageName: '@cspell/dict-th-th',
        description: 'Thai Language dictionary for cspell.',
        cspell: false,
        categories: ['natural-language'],
        dictionaries: [{ name: 'th-th', locales: ['th', 'th-th'] }],
    },
    {
        name: 'Fullstack',
        packageName: '@cspell/dict-fullstack',
        description: 'Common words encountered during fullstack development.',
        cspell: true,
        categories: ['programming'],
        dictionaries: [{ name: 'fullstack', fileTypes: ['css', 'html'] }],
    },
    {
        name: 'CSpell Bundle',
        packageName: '@cspell/dict-cspell-bundle',
        categories: ['other'],
        isBundle: true,
    },
]);

const parsers = [
    'Package,Languages,Tags',
    '[`@cspell/parser-go-strings-comments`](../packages/parser-go-strings-comments),`go`,"`comment`, `string`"',
    '[`@cspell/parser-javascript`](../packages/parser-javascript),"`javascript`, `javascriptreact`","`comment`, `jsx`"',
].join('\n');

describe('cspellPackages', () => {
    it('reads the dictionaries, with their kind, locales and file types', () => {
        assert.deepEqual(parseDictionaryPackages(dictionaries), [
            {
                packageName: '@cspell/dict-th-th',
                name: 'Thai Language',
                description: 'Thai Language dictionary for cspell.',
                kind: 'language',
                locales: ['th', 'th-th'],
                fileTypes: [],
                withCSpell: false,
            },
            {
                packageName: '@cspell/dict-fullstack',
                name: 'Fullstack',
                description: 'Common words encountered during fullstack development.',
                kind: 'wordList',
                locales: [],
                fileTypes: ['css', 'html'],
                withCSpell: true,
            },
            {
                packageName: '@cspell/dict-cspell-bundle',
                name: 'CSpell Bundle',
                description: '',
                kind: 'bundle',
                locales: [],
                fileTypes: [],
                withCSpell: false,
            },
        ]);
    });

    it("reads the parsers from cspell-parsers' Markdown-flavored CSV", () => {
        assert.deepEqual(
            parseParserPackages(parsers).map((p) => [p.packageName, p.kind, p.fileTypes]),
            [
                ['@cspell/parser-go-strings-comments', 'parser', ['go']],
                ['@cspell/parser-javascript', 'parser', ['javascript', 'javascriptreact']],
            ],
        );
    });

    it('fetches both lists, sorted by package name', async () => {
        const responses: Record<string, string> = {
            [dictionaryPackagesUrl]: dictionaries,
            [parserPackagesUrl]: parsers,
        };
        const all = await fetchCSpellPackages((url) => Promise.resolve(responses[url] ?? ''));
        assert.deepEqual(
            all.map((p) => p.packageName),
            [
                '@cspell/dict-cspell-bundle',
                '@cspell/dict-fullstack',
                '@cspell/dict-th-th',
                '@cspell/parser-go-strings-comments',
                '@cspell/parser-javascript',
            ],
        );
    });

    it('filters by every word, or with any by any word, in the package name, name or description', () => {
        const all = parseDictionaryPackages(dictionaries);
        assert.deepEqual(
            filterPackages(all, ['thai']).map((p) => p.packageName),
            ['@cspell/dict-th-th'],
        );
        assert.deepEqual(
            filterPackages(all, ['dict-th', 'LANGUAGE']).map((p) => p.packageName),
            ['@cspell/dict-th-th'],
        );
        assert.equal(filterPackages(all, []).length, 3);
        assert.equal(filterPackages(all, ['german']).length, 0);
        assert.deepEqual(
            filterPackages(all, ['thai', 'fullstack']).map((p) => p.packageName),
            [],
        );
        assert.deepEqual(
            filterPackages(all, ['thai', 'fullstack'], { any: true }).map((p) => p.packageName),
            ['@cspell/dict-th-th', '@cspell/dict-fullstack'],
        );
    });
});
