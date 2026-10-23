import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readExtensionConfigValidator } from './extensionSchema.mts';

const swedish = {
    $schema: '../../extension-runtime/extension.config.schema.json',
    name: 'swedish',
    kind: 'language',
    locale: 'sv_SE',
    nativeName: 'svenska',
    friendlyName: 'Swedish',
    displayName: 'Swedish - Code Spell Checker',
    description: 'Adds Swedish (svenska) spell checking to Code Spell Checker.',
    sample: 'samples/Seattle.md',
    cspell: { import: ['@cspell/dict-sv/cspell-ext.json'], engines: { cspell: '>=10.4.0' } },
    commands: [
        { id: 'x.enable', title: 'Enable', action: 'enable', toggle: 'locale', value: 'sv_SE', scope: 'global' },
        {
            id: 'x.disableWorkspace',
            title: 'Disable in Workspace',
            action: 'disable',
            toggle: 'locale',
            value: 'sv_SE',
            scope: 'workspace',
        },
    ],
};

const validate = await readExtensionConfigValidator();

describe('extension.config.json validation', () => {
    const file = 'extensions/swedish/extension.config.json';

    it('accepts a valid config', () => {
        assert.equal(validate(swedish, file).name, 'swedish');
    });

    it('rejects unknown keys', () => {
        assert.throws(() => validate({ ...swedish, extra: 1 }, file), /must NOT have additional properties/);
        const commands = [{ ...swedish.commands[0], target: 'global' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /\/commands\/0/);
    });

    it('rejects missing and wrong values', () => {
        assert.throws(() => validate({ ...swedish, friendlyName: '' }, file), /\/friendlyName/);
        assert.throws(() => validate({ ...swedish, name: 'Swedish' }, file), /\/name must match pattern/);
        const commands = [{ ...swedish.commands[0], action: 'toggle' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /\/commands\/0/);
    });

    it('requires the ID, title and scope of a command, and the display name and description', () => {
        for (const key of ['id', 'title', 'scope'] as const) {
            const { [key]: _, ...command } = swedish.commands[0]!;
            assert.throws(() => validate({ ...swedish, commands: [command] }, file), /\/commands\/0/);
        }
        const { displayName: _d, ...withoutDisplayName } = swedish;
        assert.throws(() => validate(withoutDisplayName, file), /doesn't match/);
        const { description: _e, ...withoutDescription } = swedish;
        assert.throws(() => validate(withoutDescription, file), /doesn't match/);
    });

    it('rejects a toggle other than locale or dictionary', () => {
        const commands = [{ ...swedish.commands[0], toggle: 'fileType' }];
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

    it('rejects duplicate command IDs', () => {
        const commands = [swedish.commands[0], { ...swedish.commands[0], value: 'sv' }];
        assert.throws(() => validate({ ...swedish, commands }, file), /duplicate command IDs x\.enable/);
    });
});
