import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { describe, test } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

import { createPrompter, createTerminalReadLine } from './prompt.mts';
import { scriptedReadLine } from './test-helpers.mts';

describe('createPrompter', () => {
    test('input returns the answer, or the default when empty', async () => {
        const readLine = scriptedReadLine(['  typed  ', '', '']);
        const prompter = createPrompter(readLine);
        assert.equal(await prompter.input('Name:', 'default'), 'typed');
        assert.equal(await prompter.input('Name:', 'default'), 'default');
        assert.equal(await prompter.input('Name:'), '');
        assert.deepEqual(readLine.prompts.map(stripVTControlCharacters), [
            '? Name: (default) ',
            '? Name: (default) ',
            '? Name: ',
        ]);
    });

    test('confirm accepts yes / no and falls back to the default', async () => {
        const prompter = createPrompter(scriptedReadLine(['y', 'YES', 'n', 'No', '', '', 'maybe']));
        assert.equal(await prompter.confirm('Ok?', false), true);
        assert.equal(await prompter.confirm('Ok?', false), true);
        assert.equal(await prompter.confirm('Ok?', true), false);
        assert.equal(await prompter.confirm('Ok?', true), false);
        assert.equal(await prompter.confirm('Ok?', true), true);
        assert.equal(await prompter.confirm('Ok?', false), false);
        assert.equal(await prompter.confirm('Ok?', true), true);
    });

    test('shows the default choice for confirm', async () => {
        const readLine = scriptedReadLine(['', '']);
        const prompter = createPrompter(readLine);
        await prompter.confirm('Ok?', true);
        await prompter.confirm('Ok?', false);
        assert.deepEqual(readLine.prompts.map(stripVTControlCharacters), ['? Ok? (Y/n) ', '? Ok? (y/N) ']);
    });

    test('fails when input ends', async () => {
        const prompter = createPrompter(scriptedReadLine([]));
        await assert.rejects(prompter.input('Name:'), /No more input/);
    });
});

describe('createTerminalReadLine', () => {
    test('reads piped lines, even when they arrive before the question', async () => {
        const input = new PassThrough();
        const output = new PassThrough();
        input.end('first\nsecond\n');
        const terminal = createTerminalReadLine(input, output);
        try {
            assert.equal(await terminal.readLine('a: '), 'first');
            assert.equal(await terminal.readLine('b: '), 'second');
            assert.equal(await terminal.readLine('c: '), undefined);
        } finally {
            terminal.close();
        }
    });
});
