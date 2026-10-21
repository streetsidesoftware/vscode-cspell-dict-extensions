// cspell:ignore elisp

/**
 * The parts of a word list that only its installed packages can tell: when each dictionary is on.
 */

import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import type { ExtensionConfig } from '../../extension-runtime/src/config.ts';
import { type DictionaryState, describeFileTypes } from '../../scripts/lib/dictionaryState.mts';
import { dictionaryStates, sampleTurnsOn } from '../../scripts/lib/syncExtension.mts';
import { npmOutput } from './exec.mts';
import { type Answers, UsageError } from './questions.mts';
import type { Sample } from './sample.mts';
import { dictionaryCommands, installedSentence, json, readme } from './writeExtension.mts';

/**
 * Set up a word list once its packages are installed. A sample the user gave must turn on one of the dictionaries;
 * otherwise the extension's folder is removed.
 * @param given - the samples the user gave, with `--sample-file` or at the prompt.
 */
export async function setUpWordList(
    destDir: string,
    answers: Answers,
    config: ExtensionConfig,
    given: readonly Sample[],
): Promise<void> {
    const dictionaries = await dictionaryStates(destDir, config);
    const wrong = given.filter((sample) => !sampleTurnsOn(sample.file, dictionaries));
    if (wrong.length) {
        await rm(destDir, { recursive: true });
        throw new UsageError(wrongSamplesMessage(wrong, dictionaries));
    }
    await writeCommands(destDir, config, dictionaries);
    await turnOnForSamples(destDir, dictionaries);
    await writeFile(path.join(destDir, 'README.md'), readme(answers, installedSentence(dictionaries)));
}

/** Why the samples were refused, with the file types that turn the dictionaries on. */
export function wrongSamplesMessage(wrong: readonly Sample[], dictionaries: readonly DictionaryState[]): string {
    const files = wrong.map((sample) => path.basename(sample.file)).join(', ');
    const when = dictionaries.map((d) => `${d.name}: ${describeFileTypes(d).replaceAll('`', '')}`).join('; ');
    return (
        `${files} turns on no dictionary of this extension (${when}). ` +
        "Give a --sample-file of one of those file types. The extension's folder was removed."
    );
}

/** Commands to turn each dictionary on and off. */
async function writeCommands(
    destDir: string,
    config: ExtensionConfig,
    dictionaries: readonly DictionaryState[],
): Promise<void> {
    const commands = dictionaryCommands(
        config.name,
        dictionaries.map((d) => d.name),
    );
    await writeFile(path.join(destDir, 'extension.config.json'), json({ ...config, commands }));
}

/** Turn on the dictionaries that are off until turned on, such as `@cspell/dict-vim`'s, so the tests check the samples. */
async function turnOnForSamples(destDir: string, dictionaries: readonly DictionaryState[]): Promise<void> {
    const off = dictionaries.filter((d) => d.off).map((d) => d.name);
    if (!off.length) return;
    console.log(`Off until turned on: ${off.join(', ')}`);
    await writeFile(path.join(destDir, 'samples/cspell.json'), json({ dictionaries: off }));
}

/**
 * Add the words of the package and dictionary names that cspell doesn't know, such as `elisp`, to `words` in the
 * extension's `cspell.config.yaml`, so its own spell check passes.
 * @param repoRoot - where cspell runs, with the repository's config.
 */
export async function addNameWords(destDir: string, config: ExtensionConfig, repoRoot: string): Promise<void> {
    const packages = (config.cspell as { import?: string[] }).import ?? [];
    const names = [...packages, ...(await dictionaryStates(destDir, config)).map((d) => d.name)];
    const unknown = unknownWords(destDir, repoRoot);
    if (!unknown) return;
    const words = nameWords(names, unknown);
    if (!words.length) return;
    const file = path.join(destDir, 'cspell.config.yaml');
    const yaml = await readFile(file, 'utf8');
    if (/^words:/m.test(yaml)) {
        console.log(styleText('yellow', `Add to words in ${file}: ${words.join(', ')}`));
        return;
    }
    console.log(`Words from the package names, added to cspell.config.yaml: ${words.join(', ')}`);
    await writeFile(file, `${yaml.trimEnd()}\nwords:\n${words.map((w) => `  - ${w}\n`).join('')}`);
}

/** The unknown words that come from the names, sorted, such as `elisp` from `@cspell/dict-elisp`. */
export function nameWords(names: readonly string[], unknown: readonly string[]): string[] {
    const inNames = new Set(names.flatMap((name) => name.toLowerCase().split(/[^\p{L}]+/u)));
    return [...new Set(unknown)].filter((word) => inNames.has(word.toLowerCase())).toSorted();
}

/** The words cspell doesn't know in the extension's files. Undefined when cspell fails. */
function unknownWords(destDir: string, repoRoot: string): string[] | undefined {
    const files = `${path.relative(repoRoot, destDir).split(path.sep).join('/')}/**`;
    const args = ['--no-progress', '--no-summary', '--words-only', '--unique', '--dot', files];
    const { stdout, stderr, status } = npmOutput(['exec', '--', 'cspell', ...args], repoRoot);
    // cspell exits 1 when it finds unknown words.
    if (status !== 0 && status !== 1) {
        console.log(styleText('yellow', `Could not spell check the extension's files: ${stderr.trim()}`));
        return undefined;
    }
    return stdout.split(/\r?\n/).filter(Boolean);
}
