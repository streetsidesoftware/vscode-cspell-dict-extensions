import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import { askQuestions, dictNameToLocale, normalizeName, toFriendlyName } from './questions.mts';
import { scriptedPrompter } from './test-helpers.mts';

describe('askQuestions', () => {
    let root = '';

    before(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-root-'));
        await mkdir(path.join(root, 'existing'));
    });

    after(() => rm(root, { recursive: true, force: true }));

    it('defaults for a natural language dictionary', async () => {
        const answers = await askQuestions(scriptedPrompter(['Swedish']), { root });
        assert.deepEqual(answers, {
            name: 'swedish',
            friendlyName: 'Swedish',
            displayName: 'Swedish - Code Spell Checker',
            description: 'Swedish dictionary extension for VS Code.',
            dictionarySrc: '@cspell/dict-sv',
            addCommands: true,
            commandName: 'Swedish',
            locale: 'sv',
            target: 'extensions/swedish',
            fullPackageName: 'code-spell-checker-swedish',
        });
    });

    it('skips the command questions without commands', async () => {
        const prompter = scriptedPrompter(['Medical Terms', '', '', '', '', false]);
        const answers = await askQuestions(prompter, { root });
        assert.deepEqual(answers, {
            name: 'medical-terms',
            friendlyName: 'Medical Terms',
            displayName: 'Medical Terms - Code Spell Checker',
            description: 'Medical Terms dictionary extension for VS Code.',
            dictionarySrc: '@cspell/dict-medical-terms',
            addCommands: false,
            commandName: '',
            locale: '',
            target: 'extensions/medical-terms',
            fullPackageName: 'code-spell-checker-medical-terms',
        });
        assert.equal(prompter.asked.length, 8);
    });

    it('defaults follow earlier answers', async () => {
        const answers = await askQuestions(
            scriptedPrompter(['', 'Dutch Words', '', '', '@cspell/dict-nl-NL', true, 'Dutch_NL', '', 'ext/nl', 'pkg']),
            { root, defaultName: 'dutch' },
        );
        assert.deepEqual(answers, {
            name: 'dutch',
            friendlyName: 'Dutch Words',
            displayName: 'Dutch Words - Code Spell Checker',
            description: 'Dutch Words dictionary extension for VS Code.',
            dictionarySrc: '@cspell/dict-nl-NL',
            addCommands: true,
            commandName: 'Dutch_NL',
            locale: 'nl-nl',
            target: 'ext/nl',
            fullPackageName: 'pkg',
        });
    });

    it('asks again for an empty name', async () => {
        const prompter = scriptedPrompter(['', 'rust']);
        const answers = await askQuestions(prompter, { root });
        assert.equal(answers.name, 'rust');
        const nameQuestions = prompter.asked.filter((q) => q.message.includes('directory name'));
        assert.deepEqual(
            nameQuestions.map((q) => q.error),
            ['Please enter a name.', undefined],
        );
    });

    it('asks again when the target directory exists', async () => {
        const prompter = scriptedPrompter(['swedish', '', '', '', '', false, 'existing', '']);
        const answers = await askQuestions(prompter, { root });
        assert.equal(answers.target, 'extensions/swedish');
        const targetQuestions = prompter.asked.filter((q) => q.message === 'Target Directory:');
        assert.deepEqual(
            targetQuestions.map((q) => q.error),
            ['existing already exists. Choose another directory.', undefined],
        );
    });

    it('lists the locales guessed from the name', async () => {
        const prompter = scriptedPrompter(['swedish']);
        await askQuestions(prompter, { root });
        const question = prompter.asked.find((q) => q.message.includes('Source cspell-dicts'));
        assert.match(
            stripVTControlCharacters(question?.message ?? ''),
            /International Locales based upon name: \n {2}sv, sv-AX, sv-FI, sv-SE\n {2}:$/,
        );
        assert.equal(question?.defaultValue, '@cspell/dict-sv');
    });
});

describe('helpers', () => {
    it('normalizeName', () => {
        assert.equal(normalizeName('Medical Terms'), 'medical-terms');
        assert.equal(normalizeName('C++'), 'c--');
    });

    it('toFriendlyName', () => {
        assert.equal(toFriendlyName('medical-terms'), 'Medical Terms');
    });

    it('dictNameToLocale', () => {
        assert.equal(dictNameToLocale('@cspell/dict-fr-FR'), 'fr-fr');
        assert.equal(dictNameToLocale('my-words'), '*');
    });
});
