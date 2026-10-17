import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createExtensionConfigValidator, generateExtensionSchema } from './extensionSchema.mts';

const swedish = {
    $schema: '../../static/extension.config.schema.json',
    name: 'swedish',
    kind: 'language',
    locale: 'sv_SE',
    nativeName: 'svenska',
    friendlyName: 'Swedish',
    sample: 'samples/Seattle.md',
    cspell: { import: ['@cspell/dict-sv/cspell-ext.json'], engines: { cspell: '>=10.4.0' } },
    commands: [
        { action: 'enable', toggle: 'locale', value: 'sv_SE' },
        { action: 'disable', toggle: 'locale', value: 'sv_SE', scope: 'workspace' },
        { action: 'enable', toggle: 'fileType', value: 'python', id: 'x.enablePython' },
    ],
};

describe('extension.config.json validation', () => {
    const validate = createExtensionConfigValidator(generateExtensionSchema());
    const file = 'extensions/swedish/extension.config.json';

    it('accepts a valid config', () => {
        assert.equal(validate(swedish, file).name, 'swedish');
    });

    it('rejects unknown keys', () => {
        assert.throws(() => validate({ ...swedish, extra: 1 }, file), /must NOT have additional properties/);
        const commands = [{ action: 'enable', toggle: 'locale', value: 'sv', target: 'global' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /\/commands\/0/);
    });

    it('rejects missing and wrong values', () => {
        assert.throws(() => validate({ ...swedish, friendlyName: '' }, file), /\/friendlyName/);
        assert.throws(() => validate({ ...swedish, name: 'Swedish' }, file), /\/name must match pattern/);
        const commands = [{ action: 'toggle', toggle: 'locale', value: 'sv' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /\/commands\/0/);
    });

    it('rejects a scope on a fileType toggle', () => {
        const commands = [{ action: 'enable', toggle: 'fileType', value: 'python', scope: 'global' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /\/commands\/0/);
    });

    it('requires a known kind, and a locale for a language', () => {
        const { kind: _kind, ...withoutKind } = swedish;
        assert.throws(() => validate(withoutKind, file), /doesn't match/);
        assert.throws(() => validate({ ...swedish, kind: 'scaffold' }, file), /doesn't match/);
        const { locale: _locale, ...withoutLocale } = swedish;
        assert.throws(() => validate(withoutLocale, file), /doesn't match/);
    });

    it('allows locale and nativeName only on a language', () => {
        const { locale: _l, nativeName: _n, commands: _c, ...rest } = swedish;
        assert.equal(validate({ ...rest, kind: 'wordList', commands: [] }, file).kind, 'wordList');
        assert.throws(() => validate({ ...rest, kind: 'wordList', commands: [], locale: 'sv' }, file), /doesn't match/);
    });

    it('requires a value when there is no locale to default to', () => {
        const { locale: _l, nativeName: _n, ...rest } = swedish;
        const commands = [{ action: 'enable', toggle: 'dictionary' }];
        assert.throws(() => validate({ ...rest, kind: 'wordList', commands }, file), /without a `value`/);
    });

    it('rejects duplicate command IDs', () => {
        const commands = [
            { action: 'enable', toggle: 'locale', value: 'sr' },
            { action: 'enable', toggle: 'locale', value: 'sr-Cyrl' },
        ];
        assert.throws(
            () => validate({ ...swedish, commands }, file),
            /duplicate command IDs cSpellExt_swedish\.enable/,
        );
    });
});
