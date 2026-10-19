import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import { cspellExtUrl } from './cspellExt.mts';
import type { FetchJson } from './npm.mts';
import { noPrompter, type Prompter } from './prompt.mts';
import { type Answers, askQuestions, type Context, filterPackages, type Options, UsageError } from './questions.mts';
import { fakeFetch, scriptedPrompter } from './test-helpers.mts';

const packages = {
    '@cspell/dict-bn': {
        description: 'Bengali dictionary for cspell.',
        cspellExt: { languageSettings: [{ languageId: '*', locale: 'bn', dictionaries: ['bn'] }] },
    },
    '@cspell/dict-sv': {
        description: 'Swedish dictionary for CSpell.',
        cspellExt: { languageSettings: [{ languageId: '*', locale: 'sv,sv_SE', dictionaries: ['sv'] }] },
    },
    '@cspell/dict-fr-reforme': {
        description: 'Français Réforme 1990 dictionary for cspell.',
        cspellExt: { languageSettings: [{ languageId: '*', locale: 'fr,fr-fr,fr-90', dictionaries: ['fr-90'] }] },
    },
    '@cspell/dict-sr-cyrl': {
        description: 'Serbian Cyrillic dictionary for cspell.',
        cspellExt: { languageSettings: [{ languageId: '*', locale: 'sr,sr-Cyrl', dictionaries: ['sr-cyrl'] }] },
    },
    '@cspell/dict-sr-latn': {
        description: 'Serbian Latin dictionary for cspell.',
        cspellExt: { languageSettings: [{ languageId: ['*'], locale: ['sr', 'sr-Latn'], dictionaries: ['sr-latn'] }] },
    },
    '@cspell/dict-medicalterms': {
        description: 'Medical Terms dictionary for cspell.',
        cspellExt: { dictionaryDefinitions: [{ name: 'medical terms' }], dictionaries: ['medical terms'] },
    },
    '@cspell/parser-typescript': { description: 'A TypeScript parser plugin for cspell.', cspellExt: undefined },
    '@cspell/parser-python-strings-comments': {
        description: 'A strings-and-comments parser plugin for cspell covering Python.',
        cspellExt: undefined,
    },
};

const searchUrl = 'https://registry.npmjs.org/-/v1/search?text=scope%3Acspell%20keywords%3Acspell&size=250&from=0';

function registry(): Record<string, unknown> {
    const responses: Record<string, unknown> = {
        [searchUrl]: {
            total: 8,
            objects: Object.entries(packages).map(([name, p]) => ({ package: { name, description: p.description } })),
        },
    };
    for (const [name, p] of Object.entries(packages)) {
        responses[`https://registry.npmjs.org/${name.replaceAll('/', '%2f')}`] = { name, description: p.description };
        if (p.cspellExt) responses[cspellExtUrl(name)] = p.cspellExt;
    }
    responses['https://registry.npmjs.org/@cspell%2fdict-missing'] = 404;
    return responses;
}

describe('askQuestions', () => {
    let extensionsDir = '';

    before(async () => {
        extensionsDir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-extensions-'));
        await mkdir(path.join(extensionsDir, 'swedish'));
    });

    after(() => rm(extensionsDir, { recursive: true, force: true }));

    function context(prompter: Prompter, fetch: FetchJson = fakeFetch(registry())): Context & { logged: string[] } {
        const logged: string[] = [];
        return {
            prompter,
            fetchJson: fetch,
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

        it('wraps several packages, and names each language for its commands', async () => {
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
            assert.equal(choices?.at(-1), '@cspell/dict-sv (has an extension)');
            assert.equal(choices?.filter((c) => c.includes('has an extension')).length, 1);
        });

        it('rejects a name that is taken', async () => {
            const prompter = scriptedPrompter(['', 'swedish', 'svenska', '', '@cspell/dict-sv', 'language', 'sv']);
            await askQuestions({}, context(prompter, fakeFetch({})));
            assert.deepEqual(
                prompter.asked.filter((q) => q.message.startsWith('Extension name')).map((q) => q.error),
                [
                    'Please enter a name.',
                    'extensions/swedish already exists. Choose another name, or pass --force to replace it.',
                    undefined,
                ],
            );
        });

        it('asks for the package names and the kind when offline', async () => {
            const prompter = scriptedPrompter(['svenska', '', '@cspell/dict-sv', 'language', 'sv']);
            const ctx = context(prompter, fakeFetch({}));
            const answers = await askQuestions({}, ctx);
            assert.deepEqual([answers.packages, answers.kind, answers.locale], [['@cspell/dict-sv'], 'language', 'sv']);
            assert.match(ctx.logged[0] ?? '', /Could not search npm/);
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

        it('fails without network unless the kind and locale are given', async () => {
            const offline = (options: Options) =>
                askQuestions({ ...options, yes: true }, context(noPrompter, fakeFetch({})));
            const sv = { name: 'svenska', packages: ['@cspell/dict-sv'] };
            await assert.rejects(offline(sv), /Missing --kind/);
            await assert.rejects(offline({ ...sv, kind: 'language' }), /Missing --locale/);
            const answers = await offline({ ...sv, kind: 'language', locale: 'sv' });
            assert.deepEqual([answers.kind, answers.locale, answers.nativeName], ['language', 'sv', 'svenska']);
            assert.equal((await offline({ ...sv, kind: 'wordList' })).kind, 'wordList');
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
            await assert.rejects(ask({ packages: ['@cspell/dict-missing'], yes: true }), /not found on npm/);
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
        { name: '@cspell/dict-sv', description: 'Swedish dictionary for CSpell.' },
        { name: '@cspell/dict-en-gb', description: 'British English dictionary for cspell.' },
        { name: '@cspell/dict-en-us', description: 'American English dictionary for cspell.' },
    ];

    it('matches every word in the name or description, existing extensions last', () => {
        const existing = new Map([['@cspell/dict-en-gb', 'british-english']]);
        assert.deepEqual(
            filterPackages(list, 'english', existing).map((p) => p.name),
            ['@cspell/dict-en-us', '@cspell/dict-en-gb'],
        );
        assert.deepEqual(
            filterPackages(list, 'BRITISH en-gb', existing).map((p) => p.name),
            ['@cspell/dict-en-gb'],
        );
        assert.equal(filterPackages(list, '', existing).length, 3);
        assert.equal(filterPackages(list, 'german', existing).length, 0);
    });
});
