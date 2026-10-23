import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import type { CSpellPackage } from '../cspellPackages.mts';
import { noPrompter } from './prompt.mts';
import type { Prompter } from './prompt.mts';
import { askQuestions, filterPackages, UsageError } from './questions.mts';
import type { Answers, Context, Options } from './questions.mts';
import { scriptedPrompter } from './test-helpers.mts';

const language = (packageName: string, name: string, locales: string[]): CSpellPackage => ({
    packageName,
    name,
    description: `${name} dictionary for cspell.`,
    kind: 'language',
    locales,
    fileTypes: [],
    withCSpell: false,
});

/** The package lists, as cspell-dicts and cspell-parsers publish them. */
const packages: CSpellPackage[] = [
    language('@cspell/dict-bn', 'Bengali', ['bn']),
    language('@cspell/dict-sv', 'Swedish', ['sv', 'sv_SE']),
    language('@cspell/dict-fr-reforme', 'Français Réforme 1990', ['fr', 'fr-fr', 'fr-90']),
    language('@cspell/dict-sr-cyrl', 'Serbian (Cyrillic)', ['sr', 'sr-Cyrl']),
    language('@cspell/dict-sr-latn', 'Serbian (Latin)', ['sr', 'sr-Latn']),
    {
        packageName: '@cspell/dict-medicalterms',
        name: 'Medical Terms',
        description: 'Medical Terms dictionary for cspell.',
        kind: 'wordList',
        locales: [],
        fileTypes: [],
        withCSpell: false,
    },
    {
        packageName: '@cspell/dict-cspell-bundle',
        name: 'CSpell Bundle',
        description: 'Dictionaries bundled with cspell.',
        kind: 'bundle',
        locales: [],
        fileTypes: [],
        withCSpell: false,
    },
    {
        packageName: '@cspell/dict-en_us',
        name: 'English - American',
        description: 'American English dictionary for cspell.',
        kind: 'language',
        locales: ['en', 'en-US'],
        fileTypes: [],
        withCSpell: true,
    },
    {
        packageName: '@cspell/parser-typescript',
        name: 'typescript',
        description: 'Parser for typescript.',
        kind: 'parser',
        locales: [],
        fileTypes: ['typescript'],
        withCSpell: false,
    },
];

describe('askQuestions', () => {
    let extensionsDir = '';

    before(async () => {
        extensionsDir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-extensions-'));
        await mkdir(path.join(extensionsDir, 'swedish'));
    });

    after(() => rm(extensionsDir, { recursive: true, force: true }));

    function context(prompter: Prompter): Context & { logged: string[] } {
        const logged: string[] = [];
        return {
            prompter,
            packages,
            extensionsDir,
            existing: new Map([['@cspell/dict-sv', 'swedish']]),
            log: (message) => logged.push(stripVTControlCharacters(message)),
            logged,
        };
    }

    const bengali: Answers = {
        name: 'bengali',
        friendlyName: 'Bengali',
        kind: 'language',
        packages: ['@cspell/dict-bn'],
        locale: 'bn',
        locales: ['bn'],
        languages: [],
        nativeName: 'বাংলা',
        displayName: '',
        description: '',
        license: 'GPL-3.0-or-later',
    };

    const firstWords = (prompter: { asked: { message: string }[] }) =>
        prompter.asked.map((q) => q.message.split(' ')[0]);

    describe('interactive', () => {
        it('starts from the name, and offers the packages that match it', async () => {
            const prompter = scriptedPrompter(['bengali']);
            assert.deepEqual(await askQuestions({}, context(prompter)), bengali);
            assert.deepEqual(firstWords(prompter), [
                'Extension',
                'Friendly',
                'Packages',
                'Search',
                'What',
                'Locale',
                'Native',
            ]);
            const extensionName = prompter.asked[0];
            assert.equal(extensionName?.defaultValue, undefined);
        });

        it('includes several packages, and names each language for its commands', async () => {
            const prompter = scriptedPrompter(['serbian']);
            const answers = await askQuestions({}, context(prompter));
            assert.deepEqual(answers.packages, ['@cspell/dict-sr-cyrl', '@cspell/dict-sr-latn']);
            assert.deepEqual([answers.kind, answers.locale], ['language', 'sr']);
            assert.deepEqual(answers.locales, ['sr', 'sr-Cyrl', 'sr-Latn']);
            assert.deepEqual(answers.languages, [
                { locale: 'sr-Cyrl', name: 'Serbian (Cyrillic)' },
                { locale: 'sr-Latn', name: 'Serbian (Latin)' },
            ]);
            const localeQuestion = prompter.asked.find((q) => q.message.startsWith('Locale'));
            assert.deepEqual(localeQuestion?.choices, ['sr', 'sr-Cyrl', 'sr-Latn']);
        });

        it('searches again when the name matches no package', async () => {
            const prompter = scriptedPrompter(['french-reforme', 'French Réforme', 'réforme']);
            const ctx = context(prompter);
            const answers = await askQuestions({}, ctx);
            assert.deepEqual(ctx.logged, ['No package matches "french reforme".']);
            assert.deepEqual(answers.packages, ['@cspell/dict-fr-reforme']);
            assert.deepEqual([answers.locale, answers.nativeName], ['fr-90', 'français']);
            assert.deepEqual(answers.locales, ['fr', 'fr-FR', 'fr-90']);
        });

        it('searches again with the words typed after a pick, and an empty answer finishes', async () => {
            const prompter = scriptedPrompter(['medical-terms', '', '', 'swedish']);
            const answers = await askQuestions({}, context(prompter));
            assert.deepEqual(answers.packages, ['@cspell/dict-medicalterms', '@cspell/dict-sv']);
            const searches = prompter.asked.filter((q) => q.message.startsWith('Search'));
            assert.deepEqual(
                searches.map((q) => q.message),
                [
                    'Search for more packages (a language or topic; empty to finish):',
                    'Search for more packages (a language or topic; empty to finish):',
                ],
            );
        });

        it('makes a word list of a dictionary without a locale', async () => {
            const prompter = scriptedPrompter(['medical-terms']);
            const answers = await askQuestions({}, context(prompter));
            const kindQuestion = prompter.asked.find((q) => q.message.startsWith('What'));
            assert.equal(kindQuestion?.defaultValue, 'wordList');
            assert.deepEqual(
                { kind: answers.kind, locale: answers.locale, nativeName: answers.nativeName },
                { kind: 'wordList', locale: '', nativeName: '' },
            );
        });

        it('asks a parser for its description, which has no default', async () => {
            const prompter = scriptedPrompter(['typescript-parser', '', '', '', '', 'Spell checks TypeScript.']);
            const answers = await askQuestions({}, context(prompter));
            assert.deepEqual(
                [answers.kind, answers.packages, answers.description],
                ['parser', ['@cspell/parser-typescript'], 'Spell checks TypeScript.'],
            );
            assert.deepEqual(
                prompter.asked.filter((q) => q.message.startsWith('Marketplace')).map((q) => q.error),
                ['Please enter a description.', undefined],
            );
        });

        it('lists packages that have an extension last, and marked', async () => {
            const prompter = scriptedPrompter(['dictionary', '', ['@cspell/dict-bn']]);
            await askQuestions({}, context(prompter));
            const choices = prompter.asked[2]?.choices?.map((c) => stripVTControlCharacters(c));
            assert.equal(choices?.at(-1), '@cspell/dict-sv: Swedish (has an extension)');
            assert.equal(choices?.filter((c) => c.includes('has an extension')).length, 1);
        });

        it('rejects a name that is taken', async () => {
            const prompter = scriptedPrompter(['', 'swedish', 'svenska']);
            await askQuestions({ packages: ['@cspell/dict-sv'] }, context(prompter));
            assert.deepEqual(
                prompter.asked.filter((q) => q.message.startsWith('Extension name')).map((q) => q.error),
                [
                    'Please enter a name.',
                    'extensions/swedish already exists. Choose another name, or pass --force to replace it.',
                    undefined,
                ],
            );
        });

        it('only asks what the options do not answer', async () => {
            const prompter = scriptedPrompter([]);
            const answers = await askQuestions(
                { name: 'svenska', packages: ['@cspell/dict-sv'], nativeName: '' },
                context(prompter),
            );
            assert.deepEqual([answers.locale, answers.nativeName], ['sv-SE', '']);
            assert.deepEqual(firstWords(prompter), ['Friendly', 'What', 'Locale']);
        });
    });

    describe('--yes', () => {
        const yes = (options: Options) => askQuestions({ ...options, yes: true }, context(noPrompter));

        it('takes every default without asking', async () => {
            assert.deepEqual(await yes({ name: 'bengali', packages: ['@cspell/dict-bn'] }), bengali);
            assert.deepEqual(
                await yes({
                    name: 'Bangla',
                    packages: ['@cspell/dict-bn'],
                    friendlyName: 'Bangla',
                    nativeName: 'Bangla',
                    displayName: 'Bangla',
                    description: 'Bangla words.',
                    locale: 'bn_BD',
                    license: 'MIT',
                }),
                {
                    ...bengali,
                    name: 'bangla',
                    friendlyName: 'Bangla',
                    locale: 'bn-BD',
                    locales: ['bn', 'bn-BD'],
                    nativeName: 'Bangla',
                    displayName: 'Bangla',
                    description: 'Bangla words.',
                    license: 'MIT',
                },
            );
            const serbian = await yes({ name: 'serbian', packages: ['@cspell/dict-sr-cyrl', '@cspell/dict-sr-latn'] });
            assert.deepEqual(
                serbian.languages.map((l) => l.name),
                ['Serbian (Cyrillic)', 'Serbian (Latin)'],
            );
        });

        it('fails when a required value is missing', async () => {
            await assert.rejects(yes({}), /Missing --name/);
            await assert.rejects(yes({ name: 'bengali' }), UsageError);
            await assert.rejects(yes({ name: 'bengali' }), /Missing --package/);
            await assert.rejects(yes({ name: 'ts', packages: ['@cspell/parser-typescript'] }), /Missing --description/);
            await assert.rejects(
                yes({ name: 'ts', packages: ['@cspell/parser-typescript'], description: '   ' }),
                /Missing --description/,
            );
            await assert.rejects(
                yes({ name: 'mixed', packages: ['@cspell/dict-bn', '@cspell/dict-sv'] }),
                /Missing --locale: the packages share no locale/,
            );
        });

        it('fails when the name is taken, unless --force replaces it', async () => {
            await assert.rejects(
                yes({ name: 'swedish', packages: ['@cspell/dict-sv'] }),
                /extensions\/swedish already exists.*--force/,
            );
            assert.equal((await yes({ name: 'swedish', packages: ['@cspell/dict-sv'], force: true })).name, 'swedish');
        });
    });

    describe('options', () => {
        const ask = (options: Options) =>
            askQuestions({ name: 'demo', friendlyName: 'Demo', ...options }, context(noPrompter));

        it('rejects packages that are not from cspell-dicts or cspell-parsers', async () => {
            await assert.rejects(
                ask({ packages: ['cspell-dict-foo'] }),
                /not a @cspell\/dict-\* or @cspell\/parser-\*/,
            );
            await assert.rejects(
                ask({ packages: ['@cspell/dict-missing'], yes: true }),
                /not in cspell-dicts or cspell-parsers/,
            );
            await assert.rejects(ask({ packages: ['@cspell/dict-cspell-bundle'], yes: true }), /is a bundle/);
            await assert.rejects(ask({ packages: ['@cspell/dict-en_us'], yes: true }), /ships with cspell/);
        });

        it('rejects options that do not fit', async () => {
            await assert.rejects(
                ask({ packages: ['@cspell/dict-sv', '@cspell/parser-typescript'] }),
                /either parsers or dictionaries/,
            );
            await assert.rejects(ask({ packages: ['@cspell/dict-sv'], kind: 'parser' }), /does not match/);
            await assert.rejects(ask({ packages: ['@cspell/parser-typescript'], kind: 'language' }), /does not match/);
            await assert.rejects(
                ask({ packages: ['@cspell/dict-medicalterms'], locale: 'en', yes: true }),
                /--locale only applies to a language/,
            );
            await assert.rejects(
                ask({ packages: ['@cspell/dict-sv'], kind: 'wordList', nativeName: 'svenska' }),
                /--native-name only applies to a language/,
            );
        });
    });
});

describe('filterPackages', () => {
    const list = [
        language('@cspell/dict-sv', 'Swedish', ['sv']),
        language('@cspell/dict-en-gb', 'British English', ['en-GB']),
        language('@cspell/dict-en-us', 'American English', ['en-US']),
    ];

    it('matches every word in the name or description, existing extensions last', () => {
        const existing = new Map([['@cspell/dict-en-gb', 'british-english']]);
        assert.deepEqual(
            filterPackages(list, 'english', existing).map((p) => p.packageName),
            ['@cspell/dict-en-us', '@cspell/dict-en-gb'],
        );
        assert.deepEqual(
            filterPackages(list, 'BRITISH en-gb', existing).map((p) => p.packageName),
            ['@cspell/dict-en-gb'],
        );
        assert.equal(filterPackages(list, '', existing).length, 3);
        assert.equal(filterPackages(list, 'german', existing).length, 0);
    });
});
