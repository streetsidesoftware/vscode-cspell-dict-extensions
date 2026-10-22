/**
 * The samples in an extension's `samples/`: the documents the tests spell check. `samples/cspell.json` is their
 * config, not a sample.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { sampleFile } from './create/sample.mts';
import { articleMarkdown, fetchArticle } from './wikipedia.mts';

const samplesConfig = 'samples/cspell.json';

/** The samples, as paths relative to the extension, e.g. `samples/seattle.md`, sorted. */
export async function listSamples(extensionDir: string): Promise<string[]> {
    const files: string[] = [];
    for await (const file of fs.glob('samples/**/*', { cwd: extensionDir, withFileTypes: true })) {
        if (!file.isFile()) continue;
        const relative = path.relative(extensionDir, path.join(file.parentPath, file.name)).split(path.sep).join('/');
        if (relative !== samplesConfig) files.push(relative);
    }
    return files.sort();
}

/**
 * Copy files into `samples/`, under their own names.
 * @param cwd - where the paths are relative to.
 * @returns the samples added.
 */
export async function addSampleFiles(extensionDir: string, files: readonly string[], cwd: string): Promise<string[]> {
    // Read them all first, so a missing file adds none.
    const samples: [string, string][] = [];
    for (const file of files) {
        const sample = `samples/${path.basename(file)}`;
        if (sample === samplesConfig) throw new Error(`${file}: ${samplesConfig} is the samples' config.`);
        samples.push([sample, await fs.readFile(path.resolve(cwd, file), 'utf8')]);
    }
    for (const [sample, text] of samples) await copyNew(extensionDir, sample, text);
    return samples.map(([sample]) => sample);
}

/**
 * Write the lead section of Wikipedia articles into `samples/`, one file each, e.g. `samples/seattle.md`.
 * @param locale - the language of the articles, e.g. `sv-SE`.
 * @param titles - in English or the language.
 * @returns the samples added.
 */
export async function addSampleArticles(
    extensionDir: string,
    locale: string,
    titles: readonly string[],
): Promise<string[]> {
    const language = locale.split(/[-_]/)[0]!.toLowerCase();
    const added: string[] = [];
    for (const title of titles) {
        const article = await fetchArticle(language, title);
        if (!article) throw new Error(`No ${language}.wikipedia.org article for "${title}".`);
        const sample = sampleFile(title);
        await copyNew(extensionDir, sample, articleMarkdown(article));
        added.push(sample);
    }
    return added;
}

/** Remove a sample. The test sample (`sample` in the config) stays: choose another first with `set --test-sample`. */
export async function removeSample(extensionDir: string, config: ExtensionConfig, sample: string): Promise<void> {
    if (sample === config.sample) {
        throw new Error(`${sample} is the test sample. Choose another with \`set --test-sample\` first.`);
    }
    if (!(await listSamples(extensionDir)).includes(sample)) throw new Error(`${sample} isn't a sample.`);
    await fs.rm(path.join(extensionDir, sample));
}

async function copyNew(extensionDir: string, sample: string, text: string): Promise<void> {
    await fs.mkdir(path.join(extensionDir, 'samples'), { recursive: true });
    await fs.writeFile(path.join(extensionDir, sample), text, { flag: 'wx' }).catch((e: unknown) => {
        if ((e as { code?: string }).code === 'EEXIST') throw new Error(`${sample} already exists.`);
        throw e;
    });
}
