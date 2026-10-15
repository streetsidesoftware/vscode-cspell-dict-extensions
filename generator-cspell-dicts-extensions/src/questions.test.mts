import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import { createPrompter } from './prompt.mts';
import { askQuestions, dictNameToLocale, normalizeName, toFriendlyName } from './questions.mts';
import { scriptedReadLine } from './test-helpers.mts';

describe('askQuestions', () => {
    test('defaults for a natural language dictionary', async () => {
        const answers = await askQuestions(createPrompter(scriptedReadLine(['Swedish', ...Array(9).fill('')])));
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

    test('skips the command questions without commands', async () => {
        const readLine = scriptedReadLine(['Medical Terms', '', '', '', '', 'n', '', '']);
        const answers = await askQuestions(createPrompter(readLine));
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
        assert.equal(readLine.prompts.length, 8);
    });

    test('defaults follow earlier answers', async () => {
        const answers = await askQuestions(
            createPrompter(
                scriptedReadLine([
                    '',
                    'Dutch Words',
                    '',
                    '',
                    '@cspell/dict-nl-NL',
                    '',
                    'Dutch_NL',
                    '',
                    'ext/nl',
                    'pkg',
                ]),
            ),
            'dutch',
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

    test('asks again for an empty name', async () => {
        const readLine = scriptedReadLine(['', 'rust', ...Array(9).fill('')]);
        const answers = await askQuestions(createPrompter(readLine));
        assert.equal(answers.name, 'rust');
        assert.equal(readLine.prompts.filter((p) => p.includes('directory name')).length, 2);
    });

    test('lists the locales guessed from the name', async () => {
        const readLine = scriptedReadLine(['swedish', ...Array(9).fill('')]);
        await askQuestions(createPrompter(readLine));
        const prompt = stripVTControlCharacters(readLine.prompts.find((p) => p.includes('Source cspell-dicts')) ?? '');
        assert.match(prompt, /International Locales based upon name: \n {2}sv, sv-AX, sv-FI, sv-SE\n {2}:/);
        assert.match(prompt, /\(@cspell\/dict-sv\) $/);
    });
});

describe('helpers', () => {
    test('normalizeName', () => {
        assert.equal(normalizeName('Medical Terms'), 'medical-terms');
        assert.equal(normalizeName('C++'), 'c--');
    });

    test('toFriendlyName', () => {
        assert.equal(toFriendlyName('medical-terms'), 'Medical Terms');
    });

    test('dictNameToLocale', () => {
        assert.equal(dictNameToLocale('@cspell/dict-fr-FR'), 'fr-fr');
        assert.equal(dictNameToLocale('my-words'), '*');
    });
});
