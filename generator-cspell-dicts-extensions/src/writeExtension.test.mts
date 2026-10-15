import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

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
        it(`renders the templates ${label}`, async (t) => {
            const written = await writeExtension(dest, answers);
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

    it('never overwrites existing files', async () => {
        await writeFile(path.join(dest, 'README.md'), 'existing');
        await assert.rejects(writeExtension(dest, withCommands), { code: 'EEXIST' });
        assert.equal(await readFile(path.join(dest, 'README.md'), 'utf8'), 'existing');

        await rm(path.join(dest, 'README.md'));
        await writeFile(path.join(dest, '.gitignore'), 'existing');
        await assert.rejects(writeExtension(dest, withCommands), { code: 'EEXIST' });
        assert.equal(await readFile(path.join(dest, '.gitignore'), 'utf8'), 'existing');
    });
});
