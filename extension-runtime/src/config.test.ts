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
                action: 'enable',
                toggle: 'locale',
                value: 'sv_SE',
                scope: 'global',
            },
            {
                id: 'cSpellExt_swedish.disableWorkspace',
                title: 'Disable Swedish Spell Checker Dictionary in Workspace',
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
        assert.equal(description(swedish), 'Swedish dictionary extension for VS Code.');
    });

    it('can be set', () => {
        const config = { ...swedish, displayName: 'D', description: 'E' };
        assert.equal(displayName(config), 'D');
        assert.equal(description(config), 'E');
    });
});
