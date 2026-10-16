import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigError, description, displayName, parseExtensionConfig, resolveCommands } from './config.ts';

const swedish = {
    name: 'swedish',
    friendlyName: 'Swedish',
    sample: 'samples/Seattle.md',
    cspell: { import: ['@cspell/dict-sv/cspell-ext.json'] },
    commands: [
        { action: 'enable', toggle: 'locale', value: 'sv_SE' },
        { action: 'disable', toggle: 'locale', value: 'sv_SE', scope: 'workspace' },
    ],
};

describe('parseExtensionConfig', () => {
    it('accepts a valid config', () => {
        const config = parseExtensionConfig({ $schema: 'x', ...swedish });
        assert.equal(config.name, 'swedish');
        assert.equal(config.commands.length, 2);
    });

    it('rejects unknown keys', () => {
        assert.throws(() => parseExtensionConfig({ ...swedish, extra: 1 }), ConfigError);
        const commands = [{ action: 'enable', toggle: 'locale', value: 'sv', target: 'global' }];
        assert.throws(() => parseExtensionConfig({ ...swedish, commands }), /commands\[0\]: unknown "target"/);
    });

    it('rejects missing and wrong values', () => {
        assert.throws(() => parseExtensionConfig({ ...swedish, friendlyName: '' }), /friendlyName/);
        const commands = [{ action: 'toggle', toggle: 'locale', value: 'sv' }];
        assert.throws(() => parseExtensionConfig({ ...swedish, commands }), /commands\[0\]\.action/);
    });

    it('rejects a scope on a fileType toggle', () => {
        const commands = [{ action: 'enable', toggle: 'fileType', value: 'python', scope: 'global' }];
        assert.throws(() => parseExtensionConfig({ ...swedish, commands }), /no scope/);
    });

    it('rejects duplicate command IDs', () => {
        const commands = [
            { action: 'enable', toggle: 'locale', value: 'sr' },
            { action: 'enable', toggle: 'locale', value: 'sr-Cyrl' },
        ];
        assert.throws(() => parseExtensionConfig({ ...swedish, commands }), /Duplicate command ID/);
    });
});

describe('resolveCommands', () => {
    it('fills in the default ID, title and scope', () => {
        const commands = resolveCommands(parseExtensionConfig(swedish));
        assert.deepEqual(commands, [
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
        const commands = [
            { action: 'enable', toggle: 'locale', value: 'sv_SE', id: 'cSpellExt_swedish.enableSwedish', title: 'T' },
        ];
        const [command] = resolveCommands(parseExtensionConfig({ ...swedish, commands }));
        assert.equal(command?.id, 'cSpellExt_swedish.enableSwedish');
        assert.equal(command?.title, 'T');
    });
});

describe('displayName and description', () => {
    it('derive from the friendly name', () => {
        const config = parseExtensionConfig(swedish);
        assert.equal(displayName(config), 'Swedish - Code Spell Checker');
        assert.equal(description(config), 'Swedish dictionary extension for VS Code.');
    });

    it('can be set', () => {
        const config = parseExtensionConfig({ ...swedish, displayName: 'D', description: 'E' });
        assert.equal(displayName(config), 'D');
        assert.equal(description(config), 'E');
    });
});
