import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classify, cspellExtUrl, mostSpecificLocale } from './cspellExt.mts';

// Trimmed copies of real cspell-ext.json files from cspell-dicts.
const sv = {
    dictionaryDefinitions: [{ name: 'sv' }],
    languageSettings: [{ languageId: '*', locale: 'sv,sv_SE', dictionaries: ['sv'] }],
    dictionaries: [],
};
const medicalterms = {
    dictionaryDefinitions: [{ name: 'medical terms' }],
    languageSettings: [],
    dictionaries: ['medical terms'],
};
const perl = {
    dictionaryDefinitions: [{ name: 'perl' }],
    languageSettings: [{ languageId: 'perl', locale: '*', dictionaries: ['perl'] }],
};
const scientificTermsUs = {
    dictionaryDefinitions: [{ name: 'scientific-terms-us' }, { name: 'mathematics-terms-us' }],
    languageSettings: [{ languageId: '*', locale: '*', dictionaries: ['scientific-terms-us', 'mathematics-terms-us'] }],
};

describe('classify', () => {
    it('finds a natural language dictionary and its locales', () => {
        assert.deepEqual(classify(sv), { naturalLanguage: true, locales: ['sv', 'sv_SE'], dictionaries: ['sv'] });
        assert.deepEqual(classify({ languageSettings: [{ languageId: '*', locale: 'es, es_ES' }] }).locales, [
            'es',
            'es_ES',
        ]);
    });

    it('finds the names of other dictionaries', () => {
        assert.deepEqual(classify(medicalterms), {
            naturalLanguage: false,
            locales: [],
            dictionaries: ['medical terms'],
        });
        assert.equal(classify(perl).naturalLanguage, false);
        assert.deepEqual(classify(scientificTermsUs), {
            naturalLanguage: false,
            locales: [],
            dictionaries: ['scientific-terms-us', 'mathematics-terms-us'],
        });
        assert.deepEqual(classify({}), { naturalLanguage: false, locales: [], dictionaries: [] });
    });
});

describe('mostSpecificLocale', () => {
    it('picks the locale with the most parts, the last one on a tie', () => {
        assert.equal(mostSpecificLocale(['sv', 'sv_SE']), 'sv_SE');
        assert.equal(mostSpecificLocale(['fr', 'fr-fr', 'fr-90']), 'fr-90');
        assert.equal(mostSpecificLocale(['bn']), 'bn');
        assert.equal(mostSpecificLocale([]), undefined);
    });
});

describe('cspellExtUrl', () => {
    it('points at jsDelivr', () => {
        assert.equal(cspellExtUrl('@cspell/dict-sv'), 'https://cdn.jsdelivr.net/npm/@cspell/dict-sv/cspell-ext.json');
    });
});
