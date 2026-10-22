// cspell:ignore elisp

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { readExtensionConfigValidator } from '../extensionSchema.mts';
import type { Answers } from './questions.mts';
import type { Sample } from './sample.mts';
import {
    dictionaryCommands,
    extensionConfig,
    installedSentence,
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
    it('writes configs the schema accepts', async () => {
        const validate = await readExtensionConfigValidator();
        for (const answers of [swedish, serbian, medicalTerms, parser]) {
            validate(extensionConfig(answers, seattle.file), `extensions/${answers.name}/extension.config.json`);
        }
        const wordList = extensionConfig(medicalTerms, seattle.file);
        const commands = dictionaryCommands(wordList, ['medical terms']);
        validate({ ...wordList, commands }, 'extensions/medical-terms/extension.config.json');
    });

    it('describes a language, with commands for its locale', () => {
        assert.deepEqual(extensionConfig(swedish, seattle.file), {
            $schema: '../../extension-runtime/extension.config.schema.json',
            name: 'swedish',
            kind: 'language',
            friendlyName: 'Swedish',
            displayName: 'Swedish - Code Spell Checker',
            description: 'Adds Swedish (svenska) spell checking to Code Spell Checker.',
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
            'description',
            'nativeName',
            'locale',
            'sample',
            'cspell',
            'commands',
        ]);
    });

    it('writes the standard names when none are given, and leaves out an empty nativeName', () => {
        const config = extensionConfig({ ...swedish, nativeName: '' }, seattle.file);
        assert.equal('nativeName' in config, false);
        assert.equal(config.displayName, 'Swedish - Code Spell Checker');
        assert.equal(config.description, 'Adds Swedish spell checking to Code Spell Checker.');
        assert.equal(
            extensionConfig(medicalTerms, 'samples/sample.md').description,
            'Adds the Medical Terms dictionary to Code Spell Checker.',
        );
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
            {
                id: 'cSpellExt_swedish.enable',
                title: 'Enable Swedish Spell Checker Dictionary',
                action: 'enable',
                toggle: 'locale',
                value: 'sv-SE',
                scope: 'global',
            },
            {
                id: 'cSpellExt_swedish.disable',
                title: 'Disable Swedish Spell Checker Dictionary',
                action: 'disable',
                toggle: 'locale',
                value: 'sv,sv-SE',
                scope: 'global',
            },
            {
                id: 'cSpellExt_swedish.enableWorkspace',
                title: 'Enable Swedish Spell Checker Dictionary in Workspace',
                action: 'enable',
                toggle: 'locale',
                value: 'sv-SE',
                scope: 'workspace',
            },
            {
                id: 'cSpellExt_swedish.disableWorkspace',
                title: 'Disable Swedish Spell Checker Dictionary in Workspace',
                action: 'disable',
                toggle: 'locale',
                value: 'sv,sv-SE',
                scope: 'workspace',
            },
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
                id: 'cSpellExt_serbian.enableCyrl',
                title: 'Enable Serbian (Cyrillic) Spell Checker Dictionary',
                action: 'enable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'global',
            },
            {
                id: 'cSpellExt_serbian.disableCyrl',
                title: 'Disable Serbian (Cyrillic) Spell Checker Dictionary',
                action: 'disable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'global',
            },
            {
                id: 'cSpellExt_serbian.enableCyrlWorkspace',
                title: 'Enable Serbian (Cyrillic) Spell Checker Dictionary in Workspace',
                action: 'enable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'workspace',
            },
            {
                id: 'cSpellExt_serbian.disableCyrlWorkspace',
                title: 'Disable Serbian (Cyrillic) Spell Checker Dictionary in Workspace',
                action: 'disable',
                toggle: 'locale',
                value: 'sr-Cyrl',
                scope: 'workspace',
            },
        ]);
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
        assert.ok(markers(readme(medicalTerms)).includes('./static/commands.json'));
        assert.ok(!markers(readme(parser)).includes('./static/dictionaries.json#markdown'));
        assert.match(readme(swedish), /^# Swedish - Code Spell Checker\n/);
        assert.match(readme({ ...swedish, displayName: 'Svenska' }), /^# Svenska\n/);
    });
});

describe('dictionaryCommands', () => {
    it('turns one dictionary on and off, globally and in the workspace, with the plain IDs', () => {
        assert.deepEqual(dictionaryCommands({ name: 'vim', friendlyName: 'Vim' }, ['vim']), [
            {
                id: 'cSpellExt_vim.enable',
                title: 'Enable Vim Spell Checker Dictionary',
                action: 'enable',
                toggle: 'dictionary',
                value: 'vim',
                scope: 'global',
            },
            {
                id: 'cSpellExt_vim.disable',
                title: 'Disable Vim Spell Checker Dictionary',
                action: 'disable',
                toggle: 'dictionary',
                value: 'vim',
                scope: 'global',
            },
            {
                id: 'cSpellExt_vim.enableWorkspace',
                title: 'Enable Vim Spell Checker Dictionary in Workspace',
                action: 'enable',
                toggle: 'dictionary',
                value: 'vim',
                scope: 'workspace',
            },
            {
                id: 'cSpellExt_vim.disableWorkspace',
                title: 'Disable Vim Spell Checker Dictionary in Workspace',
                action: 'disable',
                toggle: 'dictionary',
                value: 'vim',
                scope: 'workspace',
            },
        ]);
    });

    it('names the commands after each dictionary when there are several', () => {
        const commands = dictionaryCommands({ name: 'demo', friendlyName: 'Demo' }, ['vim', 'vim-script']);
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

    it('writes only the files a person owns, and an empty CHANGELOG.md', async () => {
        const written = await writeExtension(destDir, swedish, [seattle]);
        assert.deepEqual(written.toSorted(), [
            'CHANGELOG.md',
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
        assert.equal(await readFile(path.join(destDir, 'CHANGELOG.md'), 'utf8'), '');
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

describe('installedSentence', () => {
    const state = (name: string, fields: object) => ({
        name,
        all: false,
        fileTypes: [],
        locales: [],
        off: false,
        ...fields,
    });

    it('says when each dictionary is on, with one clause for those on in the same way', () => {
        assert.equal(
            installedSentence([state('elisp', { fileTypes: ['elisp', 'lisp'] })]),
            'Once this extension is installed, the `elisp` dictionary is on for `elisp` and `lisp` files.',
        );
        assert.equal(
            installedSentence([
                state('scientific-terms-us', { all: true }),
                state('mathematics-terms-us', { all: true }),
                state('vim', { off: true }),
            ]),
            'Once this extension is installed, the `scientific-terms-us` and `mathematics-terms-us` dictionaries are on for every file, and the `vim` dictionary is off until you turn it on.',
        );
    });
});
