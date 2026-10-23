// cspell:ignore elisp

/**
 * The parts of a word list that only its installed packages can tell: its dictionaries, and which are off.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import type { ExtensionConfig } from '../../../extension-runtime/api.ts';
import { dictionaryNames, offDictionaries } from '../syncExtension.mts';
import { npmOutput } from './exec.mts';
import { dictionaryCommands, json } from './writeExtension.mts';

/** Set up a word list once its packages are installed. */
export async function setUpWordList(destDir: string, config: ExtensionConfig): Promise<void> {
    await writeCommands(destDir, config);
    await turnOnForSamples(destDir, config);
}

/** Commands to turn each dictionary on and off. */
async function writeCommands(destDir: string, config: ExtensionConfig): Promise<void> {
    const commands = dictionaryCommands(config, await dictionaryNames(destDir, config));
    await writeFile(path.join(destDir, 'extension.config.json'), json({ ...config, commands }));
}

/** Turn on the dictionaries that no setting turns on, so the tests check the samples with them. */
async function turnOnForSamples(destDir: string, config: ExtensionConfig): Promise<void> {
    const off = await offDictionaries(destDir, config);
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
    const names = [...packages, ...(await dictionaryNames(destDir, config))];
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
