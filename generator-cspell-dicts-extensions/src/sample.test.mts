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
    languageSamples,
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

describe('languageSamples', () => {
    const first = 'Wikipedia article for the sample, in English or the language:';
    const more = 'Another article (empty to finish):';

    it('takes Seattle with --yes, and names the file after the title', async () => {
        const samples = await languageSamples('gd', undefined, context(['Seattle']));
        assert.deepEqual(
            samples.map((s) => s.file),
            ['samples/seattle.md'],
        );
        assert.match(samples[0]?.text ?? '', /^# Seattle\n\nText\.\n\nSource: \[Wikipedia: Seattle\]/);
    });

    it('takes the titles given, in order, and fails on a missing one with --yes', async () => {
        const samples = await languageSamples(
            'gd',
            ['Lingua Latina', 'Seattle'],
            context(['Seattle', 'Lingua Latina']),
        );
        assert.deepEqual(
            samples.map((s) => s.file),
            ['samples/lingua-latina.md', 'samples/seattle.md'],
        );
        await assert.rejects(
            languageSamples('gd', undefined, context([])),
            /No gd\.wikipedia\.org article about "Seattle"\. Name another article with --sample-title <title>\./,
        );
    });

    it('asks for an article with Seattle as the default, then for more until the answer is empty', async () => {
        const logged: string[] = [];
        const prompter = scriptedPrompter(['', 'Nowhere', 'Lingua Latina', 'Seattle', '']);
        const ctx = context(['Seattle', 'Lingua Latina'], { prompter, yes: false, log: (m) => logged.push(m) });
        const samples = await languageSamples('gd', undefined, ctx);
        assert.deepEqual(
            samples.map((s) => s.file),
            ['samples/seattle.md', 'samples/lingua-latina.md'],
        );
        assert.deepEqual(
            prompter.asked.map((q) => [q.message, q.defaultValue]),
            [
                [first, 'Seattle'],
                [more, undefined],
                [more, undefined],
                [more, undefined],
                [more, undefined],
            ],
        );
        assert.ok(logged.includes('No gd.wikipedia.org article about "Nowhere".'));
        assert.ok(logged.includes('samples/seattle.md is already a sample.'));
    });

    it('asks the first question again when the article is missing', async () => {
        const prompter = scriptedPrompter(['', 'Lingua Latina', '']);
        const samples = await languageSamples('gd', undefined, context(['Lingua Latina'], { prompter, yes: false }));
        assert.deepEqual(
            samples.map((s) => s.file),
            ['samples/lingua-latina.md'],
        );
        assert.deepEqual(
            prompter.asked.map((q) => q.message),
            [first, first, more],
        );
    });

    it('fails when Wikipedia cannot be reached', async () => {
        const fetchArticle = () => Promise.reject(new Error('Could not reach gd.wikipedia.org: timeout'));
        await assert.rejects(
            languageSamples(
                'gd',
                undefined,
                context([], { fetchArticle, yes: false, prompter: scriptedPrompter(['']) }),
            ),
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
