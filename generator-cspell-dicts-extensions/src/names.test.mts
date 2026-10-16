import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { nameFromDescription, normalizeName, title, toFriendlyName } from './names.mts';

describe('names', () => {
    it('normalizeName', () => {
        assert.equal(normalizeName('Medical Terms'), 'medical-terms');
        assert.equal(normalizeName('  Français Réforme 1990 '), 'francais-reforme-1990');
        assert.equal(normalizeName('C++'), 'c');
        assert.equal(normalizeName('---'), '');
    });

    it('nameFromDescription', () => {
        assert.equal(nameFromDescription('Swedish dictionary for CSpell.'), 'swedish');
        assert.equal(nameFromDescription('Medical Terms dictionary for cspell.'), 'medical-terms');
        assert.equal(nameFromDescription('Thai Language dictionary for cspell.'), 'thai');
        assert.equal(nameFromDescription('Pokémon dictionary for cspell.'), 'pokemon');
        assert.equal(nameFromDescription('A TypeScript parser plugin for cspell.'), 'typescript-parser');
        assert.equal(nameFromDescription(''), '');
    });

    it('toFriendlyName and title', () => {
        assert.equal(toFriendlyName('british-english-legacy'), 'British English Legacy');
        assert.equal(title('swedish'), 'Swedish');
        assert.equal(title(''), '');
    });
});
