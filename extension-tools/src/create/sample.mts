// cspell:ignore replacme

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { type Article, articleMarkdown } from '../wikipedia.mts';
import type { Prompter } from './prompt.mts';
import { UsageError } from './questions.mts';

/** A sample the tests spell check. The VS Code test opens the first one. */
export interface Sample {
    /** The path relative to the extension, e.g. `samples/seattle.md`. */
    file: string;
    text: string;
}

export const defaultSampleTitle = 'Seattle';

export interface SampleContext {
    prompter: Prompter;
    /** Never ask: a missing article or sample file is an error. */
    yes: boolean;
    /** Where sample file paths are relative to. */
    cwd: string;
    /** Resolves undefined when there's no article; rejects when Wikipedia can't be reached. */
    fetchArticle: (language: string, title: string) => Promise<Article | undefined>;
    log: (message: string) => void;
}

/**
 * A language's samples: Wikipedia articles in the language, one file each; the VS Code test opens the first.
 * - With titles from `--sample-title`, those. A missing article is an error with `--yes`, and asked again otherwise.
 * - Without, `--yes` takes Seattle. Otherwise ask for an article, with Seattle as the default, then for more until the
 *   answer is empty.
 * @param language - the Wikipedia language, e.g. `th`.
 */
export async function languageSamples(
    language: string,
    titles: readonly string[] | undefined,
    ctx: SampleContext,
): Promise<Sample[]> {
    const samples: Sample[] = [];
    const missing = (title: string) => `No ${language}.wikipedia.org article about "${title}".`;
    const ask = (message: string, defaultValue?: string) =>
        ctx.prompter
            .input(message, defaultValue, (text) => (text.trim() ? true : 'Enter an article title.'))
            .then((answer) => answer.trim());

    /** Fetch the article and add it, unless it's missing. */
    async function add(title: string): Promise<boolean> {
        const article = await ctx.fetchArticle(language, title).catch((e: unknown) => {
            throw new Error(`Could not fetch the sample from Wikipedia: ${e instanceof Error ? e.message : String(e)}`);
        });
        if (!article) return false;
        const file = sampleFile(title);
        if (samples.some((s) => s.file === file)) {
            ctx.log(`${file} is already a sample.`);
        } else {
            ctx.log(`Sample: ${article.url}`);
            samples.push({ file, text: articleMarkdown(article) });
        }
        return true;
    }

    if (titles?.length || ctx.yes) {
        for (let title of titles?.length ? titles : [defaultSampleTitle]) {
            while (!(await add(title))) {
                if (ctx.yes) throw new Error(`${missing(title)} Name another article with --sample-title <title>.`);
                title = await ask(`${missing(title)} Another article, in English or the language:`);
            }
        }
        return samples;
    }

    const first = 'Wikipedia article for the sample, in English or the language:';
    let title = await ask(first, defaultSampleTitle);
    while (!(await add(title))) {
        ctx.log(missing(title));
        title = await ask(first, defaultSampleTitle);
    }
    for (;;) {
        const more = (await ctx.prompter.input('Another article (empty to finish):')).trim();
        if (!more) return samples;
        if (!(await add(more))) ctx.log(missing(more));
    }
}

/**
 * The samples given with `--sample-file`, copied into `samples/` under their own names.
 * @param cwd - where the paths are relative to.
 */
export async function fileSamples(files: readonly string[], cwd: string): Promise<Sample[]> {
    const samples: Sample[] = [];
    for (const file of files) {
        const name = path.basename(file);
        if (name === 'cspell.json')
            throw new Error(`--sample-file ${file}: samples/cspell.json is the samples' config.`);
        if (samples.some((s) => s.file === `samples/${name}`)) {
            throw new Error(`--sample-file ${file}: another sample is also named ${name}.`);
        }
        const text = await readFile(path.resolve(cwd, file), 'utf8').catch((e: unknown) => {
            throw new Error(`--sample-file ${file}: ${e instanceof Error ? e.message : String(e)}`);
        });
        samples.push({ file: `samples/${name}`, text });
    }
    return samples;
}

/**
 * A word list's or a parser's sample, which has no default: with `--yes`, `--sample-file` is required. Otherwise,
 * ask for a file, and without one, write the starter sample.
 */
export async function askSampleFile(friendlyName: string, ctx: SampleContext): Promise<Sample[]> {
    if (ctx.yes) {
        throw new UsageError(
            'Missing --sample-file: a word list or a parser needs a sample, such as some of its words or code.',
        );
    }
    const answer = await ctx.prompter.input(
        'Sample file, such as some of its words or code (empty for a starter samples/sample.md to replace):',
        undefined,
        (text) => !text.trim() || existsSync(path.resolve(ctx.cwd, text.trim())) || `${text.trim()} not found.`,
    );
    return answer.trim() ? fileSamples([answer.trim()], ctx.cwd) : [starterSample(friendlyName)];
}

/** The word the starter sample misspells on purpose, so the spell check fails until it's replaced. */
export const starterMarker = 'replacme';

/** The sample of a word list or a parser, for the person to replace. */
export function starterSample(friendlyName: string): Sample {
    const text = [
        `# ${friendlyName}`,
        '',
        'Replace this text with what the extension should check: words people write that the dictionary knows, or for a parser, code in its language.',
        '',
        `Until you do, the spell check fails on this misspelling: ${starterMarker}`,
        '',
    ].join('\n');
    return { file: 'samples/sample.md', text };
}

/** The sample's file, named after the article: `Lingua Latina` is `samples/lingua-latina.md`. */
export function sampleFile(title: string): string {
    const name = title
        .trim()
        .toLowerCase()
        .replaceAll(/[^\p{L}\p{M}\p{N}]+/gu, '-')
        .replaceAll(/^-|-$/g, '');
    return `samples/${name || 'sample'}.md`;
}
