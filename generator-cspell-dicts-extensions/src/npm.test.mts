import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { packageInfo, searchPackages } from './npm.mts';
import { fakeFetch } from './test-helpers.mts';

function searchUrl(from: number): string {
    return `https://registry.npmjs.org/-/v1/search?text=scope%3Acspell%20keywords%3Acspell&size=250&from=${from}`;
}

const pkg = (name: string, description?: string) => ({ package: { name, description } });

describe('searchPackages', () => {
    it('reads every page and keeps the packages with the prefixes, sorted', async () => {
        const fetch = fakeFetch({
            [searchUrl(0)]: {
                total: 300,
                objects: [pkg('@cspell/dict-sv', 'Swedish dictionary for CSpell.'), pkg('@cspell/cspell-types')],
            },
            [searchUrl(250)]: { total: 300, objects: [pkg('@cspell/dict-bn'), pkg('@cspell/parser-typescript')] },
        });
        assert.deepEqual(await searchPackages(['@cspell/dict-'], fetch), [
            { name: '@cspell/dict-bn', description: '' },
            { name: '@cspell/dict-sv', description: 'Swedish dictionary for CSpell.' },
        ]);
        assert.deepEqual(
            (await searchPackages(['@cspell/dict-', '@cspell/parser-'], fetch)).map((p) => p.name),
            ['@cspell/dict-bn', '@cspell/dict-sv', '@cspell/parser-typescript'],
        );
    });

    it('fails when the registry cannot be reached', async () => {
        await assert.rejects(searchPackages(['@cspell/dict-'], fakeFetch({})), /offline/);
    });
});

describe('packageInfo', () => {
    const url = 'https://registry.npmjs.org/@cspell%2fdict-sv';

    it('returns the name and description', async () => {
        const fetch = fakeFetch({ [url]: { name: '@cspell/dict-sv', description: 'Swedish dictionary for CSpell.' } });
        assert.deepEqual(await packageInfo('@cspell/dict-sv', fetch), {
            name: '@cspell/dict-sv',
            description: 'Swedish dictionary for CSpell.',
        });
    });

    it('returns undefined for a missing package, and fails without a network', async () => {
        assert.equal(await packageInfo('@cspell/dict-sv', fakeFetch({ [url]: 404 })), undefined);
        await assert.rejects(packageInfo('@cspell/dict-sv', fakeFetch({ [url]: 500 })), /HTTP 500/);
        await assert.rejects(packageInfo('@cspell/dict-sv', fakeFetch({})), /offline/);
    });
});
