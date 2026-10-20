import { type Article, articleMarkdown } from '../../scripts/lib/wikipedia.mts';
import type { Prompter } from './prompt.mts';

/** The sample the tests spell check and the VS Code test opens. */
export interface Sample {
    /** The path relative to the extension, i.e. `samples/seattle.md`. */
    file: string;
    text: string;
}

export const defaultSampleTitle = 'Seattle';

export interface SampleContext {
    prompter: Prompter;
    /** Never ask: a missing article is an error. */
    yes: boolean;
    /** Resolves undefined when there's no article; rejects when Wikipedia can't be reached. */
    fetchArticle: (language: string, title: string) => Promise<Article | undefined>;
    log: (message: string) => void;
}

/**
 * A language's sample: the Wikipedia article with this title in the language. When there's none, ask for another
 * title, or with `--yes`, fail.
 * @param language - the Wikipedia language, i.e. `th`.
 */
export async function languageSample(language: string, title: string, ctx: SampleContext): Promise<Sample> {
    for (;;) {
        const article = await ctx.fetchArticle(language, title).catch((e: unknown) => {
            throw new Error(`Could not fetch the sample from Wikipedia: ${e instanceof Error ? e.message : String(e)}`);
        });
        if (article) {
            ctx.log(`Sample: ${article.url}`);
            return { file: sampleFile(title), text: articleMarkdown(article) };
        }
        const missing = `No ${language}.wikipedia.org article about "${title}".`;
        if (ctx.yes) throw new Error(`${missing} Name another article with --sample-title <title>.`);
        const answer = await ctx.prompter.input(
            `${missing} Another article, in English or the language:`,
            undefined,
            (text) => (text.trim() ? true : 'Enter an article title.'),
        );
        title = answer.trim();
    }
}

/** The sample of a word list or a parser, for the person to replace. */
export function starterSample(friendlyName: string): Sample {
    const text = [
        `# ${friendlyName}`,
        '',
        'Replace this text with what the extension should check: words people write that the dictionary knows, or for a parser, code in its language.',
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
