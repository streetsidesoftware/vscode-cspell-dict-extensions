import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { description, displayName, duplicateCommandIds, type ExtensionConfig, resolveCommands } from './config.ts';

const swedish: ExtensionConfig = {
    name: 'swedish',
    kind: 'language',
    locale: 'sv_SE',
    friendlyName: 'Swedish',
    sample: 'samples/Seattle.md',
    cspell: { import: ['@cspell/dict-sv/cspell-ext.json'] },
    commands: [
        { action: 'enable', toggle: 'locale', value: 'sv_SE' },
        { action: 'disable', toggle: 'locale', value: 'sv_SE', scope: 'workspace' },
    ],
};

describe('resolveCommands', () => {
    it('fills in the default ID, title and scope', () => {
        assert.deepEqual(resolveCommands(swedish), [
            {
                id: 'cSpellExt_swedish.enable',
                title: 'Enable Swedish Spell Checker Dictionary',
                contributes: true,
                action: 'enable',
                toggle: 'locale',
                value: 'sv_SE',
                scope: 'global',
            },
            {
                id: 'cSpellExt_swedish.disableWorkspace',
                title: 'Disable Swedish Spell Checker Dictionary in Workspace',
                contributes: true,
                action: 'disable',
                toggle: 'locale',
                value: 'sv_SE',
                scope: 'workspace',
            },
        ]);
    });

    it('keeps an explicit ID and title', () => {
        const commands: ExtensionConfig['commands'] = [
            { action: 'enable', toggle: 'locale', value: 'sv_SE', id: 'cSpellExt_swedish.enableSwedish', title: 'T' },
        ];
        const [command] = resolveCommands({ ...swedish, commands });
        assert.equal(command?.id, 'cSpellExt_swedish.enableSwedish');
        assert.equal(command?.title, 'T');
    });

    it('contributes commands unless told not to', () => {
        const commands: ExtensionConfig['commands'] = [
            { action: 'enable', toggle: 'locale', value: 'sv-SE' },
            {
                action: 'enable',
                toggle: 'locale',
                value: 'sv-SE',
                id: 'cSpellExt_swedish.enableSwedish',
                contributes: false,
                legacy: true,
            },
        ];
        assert.deepEqual(
            resolveCommands({ ...swedish, commands }).map(({ id, contributes }) => ({ id, contributes })),
            [
                { id: 'cSpellExt_swedish.enable', contributes: true },
                { id: 'cSpellExt_swedish.enableSwedish', contributes: false },
            ],
        );
    });

    it('gives a fileType toggle the global scope', () => {
        const commands: ExtensionConfig['commands'] = [{ action: 'enable', toggle: 'fileType', value: 'python' }];
        assert.equal(resolveCommands({ ...swedish, commands })[0]?.scope, 'global');
    });
});

describe('duplicateCommandIds', () => {
    it('finds IDs used more than once', () => {
        assert.deepEqual(duplicateCommandIds(swedish), []);
        const commands: ExtensionConfig['commands'] = [
            { action: 'enable', toggle: 'locale', value: 'sr' },
            { action: 'enable', toggle: 'locale', value: 'sr-Cyrl' },
        ];
        assert.deepEqual(duplicateCommandIds({ ...swedish, commands }), ['cSpellExt_swedish.enable']);
    });
});

describe('displayName and description', () => {
    it('derive from the friendly name', () => {
        assert.equal(displayName(swedish), 'Swedish - Code Spell Checker');
        assert.equal(description(swedish), 'Adds Swedish spell checking to Code Spell Checker.');
        assert.equal(
            description({ ...swedish, nativeName: 'svenska' }),
            'Adds Swedish (svenska) spell checking to Code Spell Checker.',
        );
        const wordList: ExtensionConfig = {
            name: 'medical-terms',
            kind: 'wordList',
            friendlyName: 'Medical Terms',
            sample: 'samples/sample.md',
            cspell: {},
            commands: [],
        };
        assert.equal(description(wordList), 'Adds the Medical Terms dictionary to Code Spell Checker.');
    });

    it('can be set', () => {
        const config = { ...swedish, displayName: 'D', description: 'E' };
        assert.equal(displayName(config), 'D');
        assert.equal(description(config), 'E');
    });
});
