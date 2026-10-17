import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { Answers } from './questions.mts';
import { templateDir, writeExtension } from './writeExtension.mts';

function answers(name: string, friendly: string, rest: Partial<Answers> & Pick<Answers, 'kind' | 'toggle'>): Answers {
    return {
        packageName: '',
        locale: '',
        dictionaries: [],
        name,
        friendlyName: friendly,
        displayName: `${friendly} - Code Spell Checker`,
        description: `${friendly} dictionary extension for VS Code.`,
        commandName: friendly,
        ...rest,
    };
}

const variants: Record<string, Answers> = {
    'natural language dictionary': answers('swedish', 'Swedish', {
        kind: 'dictionary',
        packageName: '@cspell/dict-sv',
        toggle: 'locale',
        locale: 'sv_SE',
    }),
    'word list dictionary': answers('medical-terms', 'Medical Terms', {
        kind: 'dictionary',
        packageName: '@cspell/dict-medicalterms',
        toggle: 'dictionary',
        dictionaries: ['medical terms'],
    }),
    parser: answers('typescript-parser', 'TypeScript Parser', {
        kind: 'parser',
        packageName: '@cspell/parser-typescript',
        toggle: 'none',
        description: 'TypeScript Parser parser extension for VS Code.',
    }),
    'scaffold with a locale': answers('extra', 'Extra', { kind: 'scaffold', toggle: 'locale' }),
    'scaffold with dictionaries': answers('extra', 'Extra', { kind: 'scaffold', toggle: 'dictionary' }),
    'scaffold with file types': answers('extra', 'Extra', { kind: 'scaffold', toggle: 'file-type' }),
};

const commandCount: Record<Answers['toggle'], number> = {
    locale: 4,
    dictionary: 4,
    'file-type': 2,
    none: 0,
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

/** Whether a template contains a placeholder, so its output depends upon the answers. Binary files never do. */
async function hasPlaceholder(file: string): Promise<boolean> {
    const content = await readFile(path.join(templateDir, file));
    return !content.includes(0) && content.includes('<%');
}

const swedish = variants['natural language dictionary'] as Answers;

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

    for (const [label, answers] of Object.entries(variants)) {
        it(`renders the templates: ${label}`, async (t) => {
            const written = await writeExtension(dest, answers);
            assert.deepEqual(written, expectedFiles);

            // Only snapshot the files that have placeholders; all others must match their template.
            const placeholders = await Promise.all(expectedFiles.map(hasPlaceholder));
            const rendered = expectedFiles.filter((_, i) => placeholders[i]);
            const unchanged = expectedFiles.filter((_, i) => !placeholders[i]);
            const text = await readText(rendered);
            t.assert.snapshot(text);

            for (const file of unchanged) {
                const expected = await readFile(path.join(templateDir, file));
                assert.ok(expected.equals(await readFile(path.join(dest, file))), `${file} matches its template`);
            }

            for (const [file, content] of Object.entries(text)) {
                assert.doesNotMatch(content, /<%/, `${file} has no template tags left`);
                if (file.endsWith('.json')) JSON.parse(content);
            }

            const pkg = JSON.parse(text['package.json'] ?? '') as { contributes: { commands: unknown[] } };
            assert.equal(pkg.contributes.commands.length, commandCount[answers.toggle]);
        });
    }

    it('never overwrites existing files', async () => {
        await writeFile(path.join(dest, 'README.md'), 'existing');
        await assert.rejects(writeExtension(dest, swedish), { code: 'EEXIST' });
        assert.equal(await readFile(path.join(dest, 'README.md'), 'utf8'), 'existing');

        await rm(path.join(dest, 'README.md'));
        await writeFile(path.join(dest, '.gitignore'), 'existing');
        await assert.rejects(writeExtension(dest, swedish), { code: 'EEXIST' });
        assert.equal(await readFile(path.join(dest, '.gitignore'), 'utf8'), 'existing');
    });
});
