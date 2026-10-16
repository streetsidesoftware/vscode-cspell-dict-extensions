import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import { cspellExtUrl } from './cspellExt.mts';
import type { FetchJson } from './npm.mts';
import { noPrompter, type Prompter } from './prompt.mts';
import { type Answers, askQuestions, type Context, filterPackages, type Options } from './questions.mts';
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
    '@cspell/dict-medicalterms': {
        description: 'Medical Terms dictionary for cspell.',
        cspellExt: { dictionaryDefinitions: [{ name: 'medical terms' }], dictionaries: ['medical terms'] },
    },
    '@cspell/parser-typescript': { description: 'A TypeScript parser plugin for cspell.', cspellExt: undefined },
};

const searchUrl = 'https://registry.npmjs.org/-/v1/search?text=scope%3Acspell%20keywords%3Acspell&size=250&from=0';

function registry(): Record<string, unknown> {
    const responses: Record<string, unknown> = {
        [searchUrl]: {
            total: 5,
            objects: Object.entries(packages).map(([name, p]) => ({ package: { name, description: p.description } })),
        },
    };
    for (const [name, p] of Object.entries(packages)) {
        responses[`https://registry.npmjs.org/${name.replace('/', '%2f')}`] = { name, description: p.description };
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
        kind: 'dictionary',
        packageName: '@cspell/dict-bn',
        toggle: 'locale',
        locale: 'bn',
        dictionaries: [],
        name: 'bengali',
        friendlyName: 'Bengali',
        displayName: 'Bengali - Code Spell Checker',
        description: 'Bengali dictionary extension for VS Code.',
        commandName: 'Bengali',
    };

    describe('interactive', () => {
        it('finds a natural language dictionary and takes the defaults', async () => {
            const prompter = scriptedPrompter(['', 'bengali']);
            assert.deepEqual(await askQuestions({}, context(prompter)), bengali);
            assert.deepEqual(
                prompter.asked.map((q) => q.message.split(' ')[0]),
                ['What', 'Search', 'Is', 'Locale', 'Extension', 'Friendly'],
            );
        });

        it('defaults to the most specific locale', async () => {
            const prompter = scriptedPrompter(['', 'fr-reforme', '', '', 'french-reforme', 'French Réforme']);
            const answers = await askQuestions({}, context(prompter));
            assert.equal(answers.locale, 'fr-90');
            assert.equal(answers.name, 'french-reforme');
            assert.equal(answers.displayName, 'French Réforme - Code Spell Checker');
            const localeQuestion = prompter.asked.find((q) => q.message.startsWith('Locale'));
            assert.deepEqual(localeQuestion?.choices, ['fr', 'fr-fr', 'fr-90']);
            assert.equal(localeQuestion?.defaultValue, 'fr-90');
            const nameQuestion = prompter.asked.find((q) => q.message.startsWith('Extension name'));
            assert.equal(nameQuestion?.defaultValue, 'francais-reforme-1990');
        });

        it('lists packages that have an extension last, and marked', async () => {
            const prompter = scriptedPrompter(['', 'dictionary']);
            await askQuestions({}, context(prompter));
            const choices = prompter.asked[1]?.choices?.map((c) => stripVTControlCharacters(c));
            assert.equal(choices?.at(-1), '@cspell/dict-sv (has an extension)');
            assert.equal(choices?.filter((c) => c.includes('has an extension')).length, 1);
        });

        it('toggles the dictionary names of a word list', async () => {
            const prompter = scriptedPrompter(['', 'medical']);
            const answers = await askQuestions({}, context(prompter));
            assert.equal(prompter.asked[2]?.defaultValue, false);
            assert.deepEqual(
                { toggle: answers.toggle, dictionaries: answers.dictionaries, name: answers.name },
                { toggle: 'dictionary', dictionaries: ['medical terms'], name: 'medical-terms' },
            );
        });

        it('creates a parser extension without commands', async () => {
            const answers = await askQuestions({}, context(scriptedPrompter(['parser', 'typescript'])));
            assert.deepEqual(answers, {
                kind: 'parser',
                packageName: '@cspell/parser-typescript',
                toggle: 'none',
                locale: '',
                dictionaries: [],
                name: 'typescript-parser',
                friendlyName: 'Typescript Parser',
                displayName: 'Typescript Parser - Code Spell Checker',
                description: 'Typescript Parser parser extension for VS Code.',
                commandName: 'Typescript Parser',
            });
        });

        it('creates a scaffold, asking for a name without a default', async () => {
            const prompter = scriptedPrompter(['scaffold', 'dictionary', '', 'swedish', 'My Words!', '']);
            const answers = await askQuestions({}, context(prompter));
            assert.deepEqual(
                { kind: answers.kind, toggle: answers.toggle, name: answers.name, packageName: answers.packageName },
                { kind: 'scaffold', toggle: 'dictionary', name: 'my-words', packageName: '' },
            );
            assert.deepEqual(
                prompter.asked.filter((q) => q.message.startsWith('Extension name')).map((q) => q.error),
                ['Please enter a name.', 'extensions/swedish already exists. Choose another name.', undefined],
            );
        });

        it('asks for the package and its kind when offline', async () => {
            const prompter = scriptedPrompter(['', 'sv', '@cspell/dict-sv', '', 'sv', 'svenska', '']);
            const ctx = context(prompter, fakeFetch({}));
            const answers = await askQuestions({}, ctx);
            assert.deepEqual(
                { packageName: answers.packageName, locale: answers.locale, name: answers.name },
                { packageName: '@cspell/dict-sv', locale: 'sv', name: 'svenska' },
            );
            assert.equal(prompter.asked[1]?.error, 'The package name starts with @cspell/dict-');
            assert.equal(ctx.logged.length, 3);
            assert.match(ctx.logged[0] ?? '', /Could not search npm/);
        });

        it('only asks what the options do not answer', async () => {
            const prompter = scriptedPrompter([]);
            const answers = await askQuestions({ package: '@cspell/dict-sv', name: 'svenska' }, context(prompter));
            assert.equal(answers.locale, 'sv_SE');
            assert.deepEqual(
                prompter.asked.map((q) => q.message.split(' ')[0]),
                ['Is', 'Locale', 'Friendly'],
            );
        });
    });

    describe('--yes', () => {
        const yes = (options: Options) => askQuestions({ ...options, yes: true }, context(noPrompter));

        it('takes every default without asking', async () => {
            assert.deepEqual(await yes({ package: '@cspell/dict-bn' }), bengali);
            assert.deepEqual(
                await yes({
                    package: '@cspell/dict-bn',
                    name: 'Bangla',
                    friendlyName: 'Bangla',
                    displayName: 'Bangla',
                    description: 'Bangla words.',
                    commandName: 'Bangla Words',
                    locale: 'bn-BD',
                }),
                {
                    ...bengali,
                    locale: 'bn-BD',
                    name: 'bangla',
                    friendlyName: 'Bangla',
                    displayName: 'Bangla',
                    description: 'Bangla words.',
                    commandName: 'Bangla Words',
                },
            );
        });

        it('creates a scaffold from options', async () => {
            const answers = await yes({ kind: 'scaffold', toggle: 'locale', locale: 'xx', name: 'Extra Words' });
            assert.deepEqual(
                { toggle: answers.toggle, locale: answers.locale, name: answers.name },
                { toggle: 'locale', locale: 'xx', name: 'extra-words' },
            );
            assert.equal(answers.description, 'Extra Words extension for VS Code.');
        });

        it('fails when a required value is missing', async () => {
            await assert.rejects(yes({}), /Missing package/);
            await assert.rejects(yes({ kind: 'scaffold' }), /Missing --toggle/);
            await assert.rejects(yes({ kind: 'scaffold', toggle: 'file-type' }), /Missing --name/);
        });

        it('fails when the derived name is taken', async () => {
            await assert.rejects(
                yes({ package: '@cspell/dict-sv' }),
                /extensions\/swedish already exists.*Pass --name/,
            );
            await assert.rejects(yes({ package: '@cspell/dict-bn', name: 'swedish' }), /--name swedish:/);
            assert.equal((await yes({ package: '@cspell/dict-sv', name: 'svenska' })).locale, 'sv_SE');
        });

        it('fails without network unless the kind and locale are given', async () => {
            const offline = (options: Options) =>
                askQuestions({ ...options, yes: true }, context(noPrompter, fakeFetch({})));
            await assert.rejects(offline({ package: '@cspell/dict-sv' }), /Missing --natural-language/);
            await assert.rejects(
                offline({ package: '@cspell/dict-sv', naturalLanguage: false, name: 'sv' }),
                /Could not find the dictionary names/,
            );
            await assert.rejects(
                offline({ package: '@cspell/dict-sv', naturalLanguage: true, name: 'sv' }),
                /Missing --locale/,
            );
            await assert.rejects(offline({ package: '@cspell/dict-sv', locale: 'sv' }), /Missing --name/);
            const answers = await offline({ package: '@cspell/dict-sv', locale: 'sv', name: 'svenska' });
            assert.deepEqual([answers.toggle, answers.locale, answers.friendlyName], ['locale', 'sv', 'Svenska']);
        });
    });

    describe('options', () => {
        const ask = (options: Options) => askQuestions(options, context(noPrompter));

        it('rejects packages that are not from cspell-dicts or cspell-parsers', async () => {
            await assert.rejects(ask({ package: 'cspell-dict-foo' }), /not a @cspell\/dict-\* or @cspell\/parser-\*/);
            await assert.rejects(ask({ package: '@cspell/dict-missing', yes: true }), /not found on npm/);
        });

        it('rejects options that do not fit', async () => {
            await assert.rejects(ask({ package: '@cspell/dict-sv', kind: 'parser' }), /does not match/);
            await assert.rejects(ask({ package: '@cspell/dict-sv', kind: 'scaffold' }), /A scaffold has no package/);
            await assert.rejects(ask({ package: '@cspell/dict-sv', toggle: 'locale' }), /--toggle only applies/);
            await assert.rejects(
                ask({ package: '@cspell/parser-typescript', naturalLanguage: true }),
                /--natural-language only applies to a dictionary/,
            );
            await assert.rejects(ask({ package: '@cspell/parser-typescript', locale: 'en' }), /--locale only applies/);
            await assert.rejects(
                ask({ kind: 'scaffold', toggle: 'dictionary', locale: 'en' }),
                /--locale only applies to a scaffold with --toggle locale/,
            );
            await assert.rejects(
                ask({ package: '@cspell/dict-sv', naturalLanguage: false, locale: 'sv' }),
                /--locale only applies to a natural language dictionary/,
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
