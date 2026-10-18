import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { Answers } from './questions.mts';
import { extensionConfig, localeCommands, readme, sampleText, writeExtension } from './writeExtension.mts';

const swedish: Answers = {
    kind: 'language',
    packageName: '@cspell/dict-sv',
    locale: 'sv-SE',
    nativeName: 'svenska',
    name: 'swedish',
    friendlyName: 'Swedish',
    displayName: '',
    description: '',
};

const medicalTerms: Answers = {
    ...swedish,
    kind: 'wordList',
    packageName: '@cspell/dict-medicalterms',
    locale: '',
    nativeName: '',
    name: 'medical-terms',
    friendlyName: 'Medical Terms',
};

const parser: Answers = {
    ...medicalTerms,
    kind: 'parser',
    packageName: '@cspell/parser-typescript',
    name: 'typescript-parser',
    friendlyName: 'TypeScript Parser',
    description: 'Spell checks TypeScript.',
};

describe('extensionConfig', () => {
    it('describes a language, with commands for its locale', () => {
        assert.deepEqual(extensionConfig(swedish), {
            $schema: '../../static/extension.config.schema.json',
            name: 'swedish',
            kind: 'language',
            friendlyName: 'Swedish',
            nativeName: 'svenska',
            locale: 'sv-SE',
            sample: 'samples/seattle.md',
            cspell: { import: ['@cspell/dict-sv/cspell-ext.json'] },
            commands: localeCommands('sv-SE'),
        });
    });

    it('orders the fields like the existing configs', () => {
        const config = extensionConfig({ ...swedish, displayName: 'Svenska', description: 'Swedish words.' });
        assert.deepEqual(Object.keys(config), [
            '$schema',
            'name',
            'kind',
            'friendlyName',
            'displayName',
            'nativeName',
            'locale',
            'description',
            'sample',
            'cspell',
            'commands',
        ]);
    });

    it('leaves out the optional fields that are empty, and writes the ones that are given', () => {
        const config = extensionConfig({ ...swedish, nativeName: '' });
        assert.equal('nativeName' in config, false);
        assert.equal('displayName' in config, false);
        assert.equal('description' in config, false);
        const named = extensionConfig({ ...swedish, displayName: 'Svenska', description: 'Swedish words.' });
        assert.deepEqual([named.displayName, named.description], ['Svenska', 'Swedish words.']);
    });

    it('gives a word list and a parser no commands', () => {
        assert.deepEqual(extensionConfig(medicalTerms).commands, []);
        assert.equal(extensionConfig(medicalTerms).kind, 'wordList');
        const config = extensionConfig(parser);
        assert.deepEqual(
            [config.kind, config.description, config.commands, config.cspell],
            ['parser', 'Spell checks TypeScript.', [], { import: ['@cspell/parser-typescript/recommended'] }],
        );
    });
});

describe('localeCommands', () => {
    it('enables the locale, and disables it with its language', () => {
        assert.deepEqual(localeCommands('sv-SE'), [
            { action: 'enable', toggle: 'locale', value: 'sv-SE' },
            { action: 'disable', toggle: 'locale', value: 'sv,sv-SE' },
            { action: 'enable', toggle: 'locale', value: 'sv-SE', scope: 'workspace' },
            { action: 'disable', toggle: 'locale', value: 'sv,sv-SE', scope: 'workspace' },
        ]);
        assert.deepEqual(
            localeCommands('bn').map((c) => c.value),
            ['bn', 'bn', 'bn', 'bn'],
        );
    });
});

describe('readme', () => {
    it('has the sections the sync fills in', () => {
        const markers = (text: string) => [...text.matchAll(/@@(inject(?:-table)?): (\S+)/g)].map((m) => m[2]);
        assert.deepEqual(markers(readme(swedish)), [
            './static/commands.json',
            '../../static/manual-settings.language.md#values-file=:./extension.config.json',
            './static/dictionaries.json#markdown',
            '../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json',
            '../../static/footer.md',
        ]);
        assert.ok(!markers(readme(medicalTerms)).includes('./static/commands.json'));
        assert.ok(!markers(readme(parser)).includes('./static/dictionaries.json#markdown'));
        assert.match(readme(swedish), /^# Swedish - Code Spell Checker\n/);
        assert.match(readme({ ...swedish, displayName: 'Svenska' }), /^# Svenska\n/);
    });
});

describe('sampleText', () => {
    it('turns on the locale of a language, and links its Wikipedia', () => {
        assert.match(sampleText(swedish), /^<!-- cspell:locale sv,en -->\n/);
        assert.match(sampleText(swedish), /https:\/\/sv\.wikipedia\.org\/wiki\/Seattle/);
        assert.doesNotMatch(sampleText(medicalTerms), /cspell:locale/);
    });
});

describe('writeExtension', () => {
    let destDir = '';

    beforeEach(async () => {
        destDir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-'));
    });

    afterEach(() => rm(destDir, { recursive: true, force: true }));

    it('writes only the files a person owns', async () => {
        const written = await writeExtension(destDir, swedish);
        assert.deepEqual(written.toSorted(), [
            'LICENSE',
            'README.md',
            'extension.config.json',
            'images/SpellCheck.png',
            'package.json',
            'samples/cspell.json',
            'samples/seattle.md',
        ]);
        const config: unknown = JSON.parse(await readFile(path.join(destDir, 'extension.config.json'), 'utf8'));
        assert.deepEqual(config, extensionConfig(swedish));
        const pkg = JSON.parse(await readFile(path.join(destDir, 'package.json'), 'utf8')) as { name: string };
        assert.equal(pkg.name, 'code-spell-checker-swedish');
    });

    it('never overwrites a file', async () => {
        await writeFile(path.join(destDir, 'README.md'), 'mine\n');
        await assert.rejects(writeExtension(destDir, swedish), /EEXIST/);
        assert.equal(await readFile(path.join(destDir, 'README.md'), 'utf8'), 'mine\n');
    });
});
