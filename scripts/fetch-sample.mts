#!/usr/bin/env node

/**
 * Fetch a sample text from Wikipedia: the lead section of an article in a language, as Markdown with its source and
 * license.
 *
 * Usage: `npm run fetch:sample -- <locale> [title] [--out <file>]`
 * - `locale`: the language, i.e. `th` or `sv-SE`.
 * - `title`: the article, in that language or in English. Default: `Seattle`.
 * - `--out`: write to a file instead of printing.
 */

import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { articleMarkdown, fetchArticle } from './lib/wikipedia.mts';

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
    const [locale, title = 'Seattle'] = positionals;
    if (!locale) throw new Error('Usage: npm run fetch:sample -- <locale> [title] [--out <file>]');
    const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? locale;
    const article = await fetchArticle(language, title);
    if (!article) throw new Error(`No ${language}.wikipedia.org article for "${title}".`);
    const markdown = articleMarkdown(article);
    if (values.out) {
        await fs.writeFile(values.out, markdown);
        console.log(`Wrote ${values.out} from ${article.url}`);
    } else {
        process.stdout.write(markdown);
    }
}

try {
    await run();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
}
