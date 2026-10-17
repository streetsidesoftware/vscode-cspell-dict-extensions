import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseJsonc } from './jsonc.mts';

describe('parseJsonc', () => {
    it('parses plain JSON', () => {
        assert.deepEqual(parseJsonc('{"a": [1, "x"], "b": null}'), { a: [1, 'x'], b: null });
    });

    it('ignores comments and trailing commas', () => {
        const text = `{
            // A line comment
            "name": "pokemon", /* a block
            comment */
            "list": ["a", "b",],
        }`;
        assert.deepEqual(parseJsonc(text), { name: 'pokemon', list: ['a', 'b'] });
    });

    it('keeps comment markers and commas inside strings', () => {
        const text = '{"url": "https://example.com/*x*/", "s": "a,]", "q": "say \\"//hi\\""}';
        assert.deepEqual(parseJsonc(text), { url: 'https://example.com/*x*/', s: 'a,]', q: 'say "//hi"' });
    });

    it('fails on invalid JSON', () => {
        assert.throws(() => parseJsonc('{name: 1}'), SyntaxError);
    });
});
