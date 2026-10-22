import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { starterMarker } from './create/sample.mts';
import { pickExtension } from './extensionConfig.mts';
import { factsText, readFacts } from './info.mts';
import { extensionsDir } from './repo.mts';

const config: ExtensionConfig = {
    name: 'demo',
    kind: 'wordList',
    friendlyName: 'Demo',
    displayName: 'Demo - Code Spell Checker',
    description: 'Demo.',
    sample: 'samples/demo.md',
    cspell: { import: ['@cspell/dict-demo/cspell-ext.json'] },
    commands: [
        {
            id: 'cSpellExt_demo.enable',
            title: 'Enable Demo',
            action: 'enable',
            toggle: 'dictionary',
            value: 'demo',
            scope: 'global',
            contributes: false,
        },
    ],
};

describe('readFacts', () => {
    let dir = '';

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'info-'));
        const pkg = path.join(dir, 'node_modules/@cspell/dict-demo');
        await fs.mkdir(pkg, { recursive: true });
        await fs.writeFile(path.join(dir, 'package.json'), '{}');
        await fs.writeFile(path.join(pkg, 'package.json'), '{ "name": "@cspell/dict-demo", "version": "1.2.3" }');
        const ext = {
            dictionaryDefinitions: [{ name: 'demo' }, { name: 'extra' }, { name: 'quiet' }],
            dictionaries: ['demo'],
            languageSettings: [{ locale: '*', dictionaries: ['extra'] }],
        };
        await fs.writeFile(path.join(pkg, 'cspell-ext.json'), JSON.stringify(ext));
        await fs.mkdir(path.join(dir, 'samples'));
        await fs.writeFile(path.join(dir, 'samples/demo.md'), 'demo\n');
        await fs.writeFile(path.join(dir, 'samples/starter.md'), `Replace this. ${starterMarker}\n`);
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it('reads the packages, commands and samples, and what is left to do', async () => {
        const facts = await readFacts({ folder: 'demo', dir }, config);
        assert.deepEqual(facts.sources[0], {
            name: '@cspell/dict-demo',
            version: '1.2.3',
            dictionaries: ['demo', 'extra', 'quiet'],
            locales: ['*'],
        });
        assert.equal(facts.commands[0]?.contributes, false);
        assert.deepEqual(facts.samples, [
            { file: 'samples/demo.md', test: true },
            { file: 'samples/starter.md', test: false },
        ]);
        assert.deepEqual(facts.off, ['quiet']);
        assert.deepEqual(facts.todo, [
            'Replace the starter text in samples/starter.md.',
            'Add commands for the extra dictionary: add command --dictionary extra',
            'Add commands for the quiet dictionary: add command --dictionary quiet',
        ]);
        assert.match(
            factsText(facts),
            /cSpellExt_demo.enable {2}Enable Demo {2}\(dictionary demo global, not listed\)/,
        );
    });
});

describe('pickExtension', () => {
    it('takes the folder given, or the one the command runs in', async () => {
        assert.equal((await pickExtension('swedish')).folder, 'swedish');
        assert.equal((await pickExtension(undefined, path.join(extensionsDir, 'swedish/samples'))).folder, 'swedish');
        await assert.rejects(pickExtension(undefined, os.tmpdir()), /Name the extension with -e <folder>/);
        await assert.rejects(pickExtension('nope'), /extensions\/nope\/package.json not found/);
    });
});
