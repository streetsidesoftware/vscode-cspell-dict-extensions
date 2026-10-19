import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeName, title, toFriendlyName } from './names.mts';

describe('names', () => {
    it('normalizeName', () => {
        assert.equal(normalizeName('Medical Terms'), 'medical-terms');
        assert.equal(normalizeName('  Français Réforme 1990 '), 'francais-reforme-1990');
        assert.equal(normalizeName('C++'), 'c');
        assert.equal(normalizeName('---'), '');
    });

    it('toFriendlyName and title', () => {
        assert.equal(toFriendlyName('british-english-legacy'), 'British English Legacy');
        assert.equal(title('swedish'), 'Swedish');
        assert.equal(title(''), '');
    });
});
