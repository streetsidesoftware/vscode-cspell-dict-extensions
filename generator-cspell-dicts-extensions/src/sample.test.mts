// cspell:ignore Београд београд กรุงเทพมหานคร

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Article } from '../../scripts/lib/wikipedia.mts';
import { noPrompter } from './prompt.mts';
import { languageSample, sampleFile, type SampleContext, starterSample } from './sample.mts';
import { scriptedPrompter } from './test-helpers.mts';

function article(title: string): Article {
    return { title, url: `https://gd.wikipedia.org/wiki/${title}`, text: 'Text.' };
}

/** A Wikipedia with only these articles. */
function context(titles: string[], overrides: Partial<SampleContext> = {}): SampleContext {
    return {
        prompter: noPrompter,
        yes: true,
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

describe('starterSample', () => {
    it('is samples/sample.md, for the person to replace', () => {
        const sample = starterSample('Medical Terms');
        assert.equal(sample.file, 'samples/sample.md');
        assert.match(sample.text, /^# Medical Terms\n\nReplace this text/);
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
