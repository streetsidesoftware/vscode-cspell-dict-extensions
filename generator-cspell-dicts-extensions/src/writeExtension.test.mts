import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { Answers } from './questions.mts';
import { templateDir, writeExtension } from './writeExtension.mts';

const withCommands: Answers = {
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
};

const withoutCommands: Answers = {
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
};

const expectedFiles = [
    'package.json',
    'README.md',
    'CHANGELOG.md',
    'cspell-ext.json',
    'src/extension.ts',
    'samples/cspell.json',
    'samples/seattle.md',
    'LICENSE',
    '.vscode/launch.json',
    '.vscode/tasks.json',
    'images/SpellCheck.png',
    '.gitignore',
    '.vscodeignore',
    'tsconfig.json',
    'cspell.config.yaml',
];

const copiedFiles = [
    '.vscode/launch.json',
    '.vscode/tasks.json',
    'images/SpellCheck.png',
    '.gitignore',
    '.vscodeignore',
    'tsconfig.json',
    'cspell.config.yaml',
];

const neverOverwrite = () => Promise.resolve(false);

describe('writeExtension', () => {
    let dest = '';

    beforeEach(async () => {
        dest = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-'));
    });

    afterEach(async () => {
        await rm(dest, { recursive: true, force: true });
    });

    async function readText(files: string[]): Promise<Record<string, string>> {
        const entries = await Promise.all(
            files.map(async (file) => [file, await readFile(path.join(dest, file), 'utf8')] as const),
        );
        return Object.fromEntries(entries);
    }

    for (const [label, answers] of [
        ['with commands', withCommands],
        ['without commands', withoutCommands],
    ] as const) {
        test(`renders the templates ${label}`, async (t) => {
            const written = await writeExtension(dest, answers, { confirmOverwrite: neverOverwrite });
            assert.deepEqual(written, expectedFiles);

            const rendered = expectedFiles.filter((file) => !copiedFiles.includes(file));
            t.assert.snapshot(await readText(rendered));

            for (const file of copiedFiles) {
                const expected = await readFile(path.join(templateDir, file));
                assert.ok(expected.equals(await readFile(path.join(dest, file))), `${file} is copied as is`);
            }

            // The rendered package.json is valid JSON.
            const pkg = JSON.parse(await readFile(path.join(dest, 'package.json'), 'utf8')) as {
                contributes: { commands?: unknown[] };
            };
            assert.equal(pkg.contributes.commands?.length, answers.addCommands ? 4 : undefined);
        });
    }

    test('asks before overwriting changed files', async () => {
        await writeExtension(dest, withCommands, { confirmOverwrite: neverOverwrite });
        await writeFile(path.join(dest, 'README.md'), 'changed');
        await writeFile(path.join(dest, 'LICENSE'), 'changed');

        const asked: string[] = [];
        const log: string[] = [];
        const written = await writeExtension(dest, withCommands, {
            confirmOverwrite: (file) => {
                asked.push(file);
                return Promise.resolve(file === 'README.md');
            },
            log: (message) => log.push(message),
        });

        assert.deepEqual(asked, ['README.md', 'LICENSE']);
        assert.deepEqual(written, ['README.md']);
        assert.equal(await readFile(path.join(dest, 'LICENSE'), 'utf8'), 'changed');
        assert.notEqual(await readFile(path.join(dest, 'README.md'), 'utf8'), 'changed');
        assert.ok(log.includes('force README.md'));
        assert.ok(log.includes('skip LICENSE'));
        assert.ok(log.includes('identical package.json'));
    });
});
