// cspell:ignore Београд београд กรุงเทพมหานคร

import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { Article } from '../../scripts/lib/wikipedia.mts';
import { noPrompter } from './prompt.mts';
import {
    askSampleFile,
    fileSamples,
    languageSample,
    sampleFile,
    type SampleContext,
    starterMarker,
    starterSample,
} from './sample.mts';
import { scriptedPrompter } from './test-helpers.mts';

function article(title: string): Article {
    return { title, url: `https://gd.wikipedia.org/wiki/${title}`, text: 'Text.' };
}

/** A Wikipedia with only these articles. */
function context(titles: string[], overrides: Partial<SampleContext> = {}): SampleContext {
    return {
        prompter: noPrompter,
        yes: true,
        cwd: '',
        fetchArticle: (_language, title) => Promise.resolve(titles.includes(title) ? article(title) : undefined),
        log: () => undefined,
        ...overrides,
    };
}

describe('languageSample', () => {
    it('fetches the article, and names the file after the title given', async () => {
        const sample = await languageSample('gd', 'Seattle', context(['Seattle']));
        assert.equal(sample.file, 'samples/seattle.md');
        assert.match(sample.text, /^# Seattle\n\nText\.\n\nSource: \[Wikipedia: Seattle\]/);
    });

    it('fails without an article with --yes, and says how to name another', async () => {
        await assert.rejects(
            languageSample('gd', 'Seattle', context([])),
            /No gd\.wikipedia\.org article about "Seattle"\. Name another article with --sample-title <title>\./,
        );
    });

    it('asks for another article until one is found', async () => {
        const prompter = scriptedPrompter(['', 'Nowhere', 'Lingua Latina']);
        const sample = await languageSample('gd', 'Seattle', context(['Lingua Latina'], { prompter, yes: false }));
        assert.equal(sample.file, 'samples/lingua-latina.md');
        assert.deepEqual(
            prompter.asked.map((q) => [q.message, q.error]),
            [
                [
                    'No gd.wikipedia.org article about "Seattle". Another article, in English or the language:',
                    'Enter an article title.',
                ],
                [
                    'No gd.wikipedia.org article about "Seattle". Another article, in English or the language:',
                    undefined,
                ],
                [
                    'No gd.wikipedia.org article about "Nowhere". Another article, in English or the language:',
                    undefined,
                ],
            ],
        );
    });

    it('fails when Wikipedia cannot be reached', async () => {
        const fetchArticle = () => Promise.reject(new Error('Could not reach gd.wikipedia.org: timeout'));
        await assert.rejects(
            languageSample('gd', 'Seattle', context([], { fetchArticle, yes: false })),
            /Could not fetch the sample from Wikipedia: Could not reach gd\.wikipedia\.org: timeout/,
        );
    });
});

describe('fileSamples', () => {
    it('copies each file into samples/ under its own name, relative to the directory given', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'cspell-samples-'));
        try {
            await writeFile(path.join(dir, 'words.md'), '# Words\n');
            await writeFile(path.join(dir, 'sample.go'), 'package main\n');
            assert.deepEqual(await fileSamples(['words.md', path.join(dir, 'sample.go')], dir), [
                { file: 'samples/words.md', text: '# Words\n' },
                { file: 'samples/sample.go', text: 'package main\n' },
            ]);
            await assert.rejects(fileSamples(['missing.md'], dir), /--sample-file missing\.md: ENOENT/);
            await assert.rejects(fileSamples(['cspell.json'], dir), /samples\/cspell\.json is the samples' config/);
            await assert.rejects(
                fileSamples(['words.md', `./words.md`], dir),
                /--sample-file \.\/words\.md: another sample is also named words\.md/,
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});

describe('askSampleFile', () => {
    it('requires --sample-file with --yes', async () => {
        await assert.rejects(askSampleFile('Medical Terms', context([])), /Missing --sample-file/);
    });

    it('asks for a sample file, and copies it in', async () => {
        const dir = await mkdtemp(path.join(tmpdir(), 'cspell-samples-'));
        try {
            await writeFile(path.join(dir, 'terms.md'), '# Terms\n');
            const prompter = scriptedPrompter(['missing.md', 'terms.md']);
            const samples = await askSampleFile('Medical Terms', context([], { prompter, yes: false, cwd: dir }));
            assert.deepEqual(samples, [{ file: 'samples/terms.md', text: '# Terms\n' }]);
            assert.deepEqual(
                prompter.asked.map((q) => q.error),
                ['missing.md not found.', undefined],
            );
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });

    it('writes the starter sample without one', async () => {
        const prompter = scriptedPrompter(['']);
        const samples = await askSampleFile('Medical Terms', context([], { prompter, yes: false }));
        assert.deepEqual(samples, [starterSample('Medical Terms')]);
    });
});

describe('starterSample', () => {
    it('is samples/sample.md, with a misspelling so the spell check fails until it is replaced', () => {
        const sample = starterSample('Medical Terms');
        assert.equal(sample.file, 'samples/sample.md');
        assert.match(sample.text, /^# Medical Terms\n\nReplace this text/);
        assert.ok(sample.text.includes(starterMarker));
    });
});

describe('sampleFile', () => {
    it('lowercases the title, with hyphens between its words', () => {
        assert.equal(sampleFile('Lingua Latina'), 'samples/lingua-latina.md');
        assert.equal(sampleFile('Seattle, Washington'), 'samples/seattle-washington.md');
        assert.equal(sampleFile('Београд'), 'samples/београд.md');
        assert.equal(sampleFile('กรุงเทพมหานคร'), 'samples/กรุงเทพมหานคร.md');
    });
});
