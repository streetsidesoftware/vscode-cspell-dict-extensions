import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { Answers } from './questions.mts';
import type { Sample } from './sample.mts';
import {
    dictionaryCommands,
    extensionConfig,
    localeCommands,
    readme,
    sampleConfig,
    writeExtension,
} from './writeExtension.mts';

const seattle: Sample = { file: 'samples/seattle.md', text: '# Seattle\n\nText.\n' };

const swedish: Answers = {
    name: 'swedish',
    friendlyName: 'Swedish',
    kind: 'language',
    packages: ['@cspell/dict-sv'],
    locale: 'sv-SE',
    locales: ['sv', 'sv-SE'],
    languages: [],
    nativeName: 'svenska',
    displayName: '',
    description: '',
    license: 'GPL-3.0-or-later',
};

const serbian: Answers = {
    ...swedish,
    name: 'serbian',
    friendlyName: 'Serbian',
    packages: ['@cspell/dict-sr-cyrl', '@cspell/dict-sr-latn'],
    locale: 'sr',
    locales: ['sr', 'sr-Cyrl', 'sr-Latn'],
    languages: [
        { locale: 'sr-Cyrl', name: 'Serbian (Cyrillic)' },
        { locale: 'sr-Latn', name: 'Serbian (Latin)' },
    ],
};

const medicalTerms: Answers = {
    ...swedish,
    kind: 'wordList',
    packages: ['@cspell/dict-medicalterms'],
    locale: '',
    locales: [],
    nativeName: '',
    name: 'medical-terms',
    friendlyName: 'Medical Terms',
};

const parser: Answers = {
    ...medicalTerms,
    kind: 'parser',
    packages: ['@cspell/parser-typescript'],
    name: 'typescript-parser',
    friendlyName: 'TypeScript Parser',
    description: 'Spell checks TypeScript.',
};

describe('extensionConfig', () => {
    it('describes a language, with commands for its locale', () => {
        assert.deepEqual(extensionConfig(swedish, seattle.file), {
            $schema: '../../static/extension.config.schema.json',
            name: 'swedish',
            kind: 'language',
            friendlyName: 'Swedish',
            nativeName: 'svenska',
            locale: 'sv-SE',
            sample: 'samples/seattle.md',
            cspell: { import: ['@cspell/dict-sv/cspell-ext.json'] },
            commands: localeCommands(swedish),
        });
        assert.deepEqual(extensionConfig(serbian, seattle.file).cspell, {
            import: ['@cspell/dict-sr-cyrl/cspell-ext.json', '@cspell/dict-sr-latn/cspell-ext.json'],
        });
    });

    it('orders the fields like the existing configs', () => {
        const config = extensionConfig(
            { ...swedish, displayName: 'Svenska', description: 'Swedish words.' },
            seattle.file,
        );
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
        const config = extensionConfig({ ...swedish, nativeName: '' }, seattle.file);
        assert.equal('nativeName' in config, false);
        assert.equal('displayName' in config, false);
        assert.equal('description' in config, false);
        const named = extensionConfig(
            { ...swedish, displayName: 'Svenska', description: 'Swedish words.' },
            seattle.file,
        );
        assert.deepEqual([named.displayName, named.description], ['Svenska', 'Swedish words.']);
    });

    it('gives a word list and a parser no commands', () => {
        assert.deepEqual(extensionConfig(medicalTerms, 'samples/sample.md').commands, []);
        assert.equal(extensionConfig(medicalTerms, 'samples/sample.md').kind, 'wordList');
        const config = extensionConfig(parser, 'samples/sample.md');
        assert.deepEqual(
            [config.kind, config.description, config.commands, config.cspell],
            ['parser', 'Spell checks TypeScript.', [], { import: ['@cspell/parser-typescript/recommended'] }],
        );
    });
});

describe('localeCommands', () => {
    it('enables the locale, and disables every locale the packages declare', () => {
        assert.deepEqual(localeCommands(swedish), [
            { action: 'enable', toggle: 'locale', value: 'sv-SE' },
            { action: 'disable', toggle: 'locale', value: 'sv,sv-SE' },
            { action: 'enable', toggle: 'locale', value: 'sv-SE', scope: 'workspace' },
            { action: 'disable', toggle: 'locale', value: 'sv,sv-SE', scope: 'workspace' },
        ]);
    });

    it('gives each of several languages its own commands', () => {
        const commands = localeCommands(serbian);
        assert.deepEqual(
            commands.slice(0, 2).map((c) => c.value),
            ['sr', 'sr,sr-Cyrl,sr-Latn'],
        );
        assert.deepEqual(commands.slice(4, 8), [
            {
                action: 'enable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                id: 'cSpellExt_serbian.enableCyrl',
                title: 'Enable Serbian (Cyrillic) Spell Checker Dictionary',
            },
            {
                action: 'disable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                id: 'cSpellExt_serbian.disableCyrl',
                title: 'Disable Serbian (Cyrillic) Spell Checker Dictionary',
            },
            {
                action: 'enable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'workspace',
                id: 'cSpellExt_serbian.enableCyrlWorkspace',
                title: 'Enable Serbian (Cyrillic) Spell Checker Dictionary in Workspace',
            },
            {
                action: 'disable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'workspace',
                id: 'cSpellExt_serbian.disableCyrlWorkspace',
                title: 'Disable Serbian (Cyrillic) Spell Checker Dictionary in Workspace',
            },
        ]);
        assert.equal(commands.length, 12);
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
        assert.ok(markers(readme(medicalTerms, true)).includes('./static/commands.json'));
        assert.ok(!markers(readme(parser)).includes('./static/dictionaries.json#markdown'));
        assert.match(readme(swedish), /^# Swedish - Code Spell Checker\n/);
        assert.match(readme({ ...swedish, displayName: 'Svenska' }), /^# Svenska\n/);
    });
});

describe('dictionaryCommands', () => {
    it('turns one dictionary on and off, globally and in the workspace, with the default IDs', () => {
        assert.deepEqual(dictionaryCommands('vim', ['vim']), [
            { action: 'enable', toggle: 'dictionary', value: 'vim' },
            { action: 'disable', toggle: 'dictionary', value: 'vim' },
            { action: 'enable', toggle: 'dictionary', value: 'vim', scope: 'workspace' },
            { action: 'disable', toggle: 'dictionary', value: 'vim', scope: 'workspace' },
        ]);
    });

    it('names the commands after each dictionary when there are several', () => {
        const commands = dictionaryCommands('demo', ['vim', 'vim-script']);
        assert.deepEqual(
            commands.map((c) => [c.id, c.title]),
            [
                ['cSpellExt_demo.enableVim', 'Enable vim Spell Checker Dictionary'],
                ['cSpellExt_demo.disableVim', 'Disable vim Spell Checker Dictionary'],
                ['cSpellExt_demo.enableVimWorkspace', 'Enable vim Spell Checker Dictionary in Workspace'],
                ['cSpellExt_demo.disableVimWorkspace', 'Disable vim Spell Checker Dictionary in Workspace'],
                ['cSpellExt_demo.enableVimScript', 'Enable vim-script Spell Checker Dictionary'],
                ['cSpellExt_demo.disableVimScript', 'Disable vim-script Spell Checker Dictionary'],
                ['cSpellExt_demo.enableVimScriptWorkspace', 'Enable vim-script Spell Checker Dictionary in Workspace'],
                [
                    'cSpellExt_demo.disableVimScriptWorkspace',
                    'Disable vim-script Spell Checker Dictionary in Workspace',
                ],
            ],
        );
    });
});

describe('sampleConfig', () => {
    it('turns on the locale of a language', () => {
        assert.deepEqual(sampleConfig(swedish), { language: 'sv-SE,en' });
        assert.deepEqual(sampleConfig(medicalTerms), {});
    });
});

describe('writeExtension', () => {
    let destDir = '';

    beforeEach(async () => {
        destDir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-'));
    });

    afterEach(() => rm(destDir, { recursive: true, force: true }));

    it('writes only the files a person owns', async () => {
        const written = await writeExtension(destDir, swedish, [seattle]);
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
        assert.deepEqual(config, extensionConfig(swedish, seattle.file));
        const pkg = JSON.parse(await readFile(path.join(destDir, 'package.json'), 'utf8')) as { name: string };
        assert.equal(pkg.name, 'code-spell-checker-swedish');
    });

    it('writes the GPL text only for the default license', async () => {
        const logged: string[] = [];
        const written = await writeExtension(destDir, { ...swedish, license: 'MIT' }, [seattle], {
            log: (m) => logged.push(m),
        });
        assert.ok(!written.includes('LICENSE'));
        assert.ok(logged.includes('Add the text of the MIT license to LICENSE.'));
        const pkg = JSON.parse(await readFile(path.join(destDir, 'package.json'), 'utf8')) as { license: string };
        assert.equal(pkg.license, 'MIT');
    });

    it('writes the samples it is given, and names the first in extension.config.json', async () => {
        const latin: Sample = { file: 'samples/lingua-latina.md', text: '# Lingua Latina\n' };
        await writeExtension(destDir, swedish, [latin, seattle]);
        assert.equal(await readFile(path.join(destDir, latin.file), 'utf8'), latin.text);
        assert.equal(await readFile(path.join(destDir, seattle.file), 'utf8'), seattle.text);
        const config = JSON.parse(await readFile(path.join(destDir, 'extension.config.json'), 'utf8')) as {
            sample: string;
        };
        assert.equal(config.sample, latin.file);
    });

    it('never overwrites a file', async () => {
        await writeFile(path.join(destDir, 'README.md'), 'mine\n');
        await assert.rejects(writeExtension(destDir, swedish, [seattle]), /EEXIST/);
        assert.equal(await readFile(path.join(destDir, 'README.md'), 'utf8'), 'mine\n');
    });
});
