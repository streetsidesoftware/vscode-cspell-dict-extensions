import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { addCommandSet, removeCommands, setFields } from './editConfig.mts';

const serbian: ExtensionConfig = {
    name: 'serbian',
    kind: 'language',
    locale: 'sr',
    friendlyName: 'Serbian',
    displayName: 'Serbian - Code Spell Checker',
    description: 'Serbian.',
    sample: 'samples/sample.md',
    cspell: { import: ['@cspell/dict-sr-cyrl/cspell-ext.json'] },
    commands: [],
};

const ids = (config: ExtensionConfig) => config.commands.map((c) => c.id);

describe('addCommandSet', () => {
    it('gives the first set of a toggle the plain IDs and titles', () => {
        const config = addCommandSet(serbian, 'locale', 'sr');
        assert.deepEqual(ids(config), [
            'cSpellExt_serbian.enable',
            'cSpellExt_serbian.disable',
            'cSpellExt_serbian.enableWorkspace',
            'cSpellExt_serbian.disableWorkspace',
        ]);
        assert.equal(config.commands[0]?.title, 'Enable Serbian Spell Checker Dictionary');
        assert.deepEqual(config.commands[3], {
            id: 'cSpellExt_serbian.disableWorkspace',
            title: 'Disable Serbian Spell Checker Dictionary in Workspace',
            action: 'disable',
            toggle: 'locale',
            value: 'sr',
            scope: 'workspace',
        });
    });

    it('names a later set after its locale or dictionary', () => {
        const config = addCommandSet(addCommandSet(serbian, 'locale', 'sr'), 'locale', 'sr-Cyrl');
        assert.equal(config.commands[4]?.id, 'cSpellExt_serbian.enableCyrl');
        assert.equal(config.commands[4]?.title, 'Enable Serbian (Cyrillic) Spell Checker Dictionary');
        const words = addCommandSet(addCommandSet(serbian, 'dictionary', 'sr'), 'dictionary', 'vim-script');
        assert.equal(words.commands[4]?.id, 'cSpellExt_serbian.enableVimScript');
        assert.equal(words.commands[4]?.title, 'Enable vim-script Spell Checker Dictionary');
    });

    it('takes the label and suffix given', () => {
        const config = addCommandSet(serbian, 'locale', 'sr-Latn', { label: 'Serbian Latin', suffix: 'Latin' });
        assert.equal(config.commands[0]?.id, 'cSpellExt_serbian.enableLatin');
        assert.equal(config.commands[0]?.title, 'Enable Serbian Latin Spell Checker Dictionary');
    });

    it('refuses an ID the extension has', () => {
        const config = addCommandSet(serbian, 'locale', 'sr');
        assert.throws(
            () => addCommandSet(config, 'locale', 'sr', { suffix: '' }),
            /already has cSpellExt_serbian.enable,/,
        );
    });
});

describe('removeCommands', () => {
    it('removes by ID, and refuses one the extension lacks', () => {
        const config = addCommandSet(serbian, 'locale', 'sr');
        assert.deepEqual(ids(removeCommands(config, ['cSpellExt_serbian.enable'])).length, 3);
        assert.throws(() => removeCommands(config, ['cSpellExt_serbian.nope']), /no command cSpellExt_serbian.nope/);
    });
});

describe('setFields', () => {
    it('renames the standard titles with the friendly name, and keeps the others', () => {
        const config = addCommandSet(serbian, 'locale', 'sr');
        const custom = {
            ...config,
            commands: [...config.commands, { ...config.commands[0]!, id: 'x', title: 'Mine' }],
        };
        const result = setFields(custom, { friendlyName: 'Latin Serbian' });
        assert.equal(result.friendlyName, 'Latin Serbian');
        assert.deepEqual(
            result.commands.map((c) => c.title),
            [
                'Enable Latin Serbian Spell Checker Dictionary',
                'Disable Latin Serbian Spell Checker Dictionary',
                'Enable Latin Serbian Spell Checker Dictionary in Workspace',
                'Disable Latin Serbian Spell Checker Dictionary in Workspace',
                'Mine',
            ],
        );
    });

    it('sets and removes engines, and leaves the other fields', () => {
        const withEngine = setFields(serbian, { engines: { cspell: '>=9' }, sample: 'samples/other.md' });
        assert.deepEqual(withEngine.cspell, { ...serbian.cspell, engines: { cspell: '>=9' } });
        assert.equal(withEngine.sample, 'samples/other.md');
        assert.equal(withEngine.description, serbian.description);
        assert.deepEqual(setFields(withEngine, { engines: { cspell: '' } }).cspell, serbian.cspell);
    });

    it('sets the locale only for a language', () => {
        assert.equal((setFields(serbian, { locale: 'sr-Cyrl' }) as { locale: string }).locale, 'sr-Cyrl');
        const { locale: _locale, ...rest } = serbian;
        assert.throws(() => setFields({ ...rest, kind: 'wordList' }, { locale: 'sr' }), /only for a language/);
    });
});
