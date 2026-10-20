import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dictionaryTypes } from './dictionaryTypes.mts';

describe('dictionaryTypes', () => {
    it("files each extension under its kind's category, and the ones without a config under the default", () => {
        const kinds = new Map([
            ['extensions/cspell-bundled-dictionaries', 'bundle' as const],
            ['extensions/hunspell-syntax', undefined],
            ['extensions/medical-terms', 'wordList' as const],
            ['extensions/swedish', 'language' as const],
            ['extensions/typescript-parser', 'parser' as const],
        ]);
        assert.deepEqual(dictionaryTypes(kinds), {
            types: {
                Support: ['extensions/cspell-bundled-dictionaries'],
                'Technical Terms': ['extensions/medical-terms'],
                Languages: ['extensions/swedish'],
                Parsers: ['extensions/typescript-parser'],
            },
            default: 'Other',
        });
    });
});
