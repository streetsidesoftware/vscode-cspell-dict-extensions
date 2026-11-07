// cspell:ignore elisp vimrc

/**
 * The parts of a word list that only its installed packages can tell: its dictionaries and their states.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import type { ExtensionConfig } from '../../../extension-runtime/api.ts';
import { dictionaryNames, dictionaryStates, dictionaryRows } from '../syncExtension.mts';
import { npmOutput } from './exec.mts';
import { dictionaryCommands, json } from './writeExtension.mts';

/** Set up a word list once its packages are installed. */
export async function setUpWordList(destDir: string, config: ExtensionConfig): Promise<void> {
    await writeCommands(destDir, config);
    await enableForSamples(destDir, config);
}

/** Commands to enable and disable each dictionary. */
async function writeCommands(destDir: string, config: ExtensionConfig): Promise<void> {
    const commands = dictionaryCommands(config, await dictionaryNames(destDir, config));
    await writeFile(path.join(destDir, 'extension.config.json'), json({ ...config, commands }));
}

/** Enable the disabled dictionaries in the samples' config, so the tests check the samples with them. */
async function enableForSamples(destDir: string, config: ExtensionConfig): Promise<void> {
    const states = await dictionaryStates(destDir, config);
    const disabled = [...states].filter(([, state]) => state === 'disabled').map(([name]) => name);
    if (!disabled.length) return;
    console.log(`Disabled by default: ${disabled.join(', ')}`);
    await writeFile(path.join(destDir, 'samples/cspell.json'), json({ dictionaries: disabled }));
}

/**
 * Add the words that cspell doesn't know from the package names and dictionary names, such as `elisp`, and from the
 * dictionaries table, such as `vimrc` in a glob, to `words` in the extension's `cspell.config.yaml`, so its own spell
 * check passes.
 * @param repoRoot - where cspell runs, with the repository's config.
 */
export async function addNameWords(destDir: string, config: ExtensionConfig, repoRoot: string): Promise<void> {
    const packages = (config.cspell as { import?: string[] }).import ?? [];
    const table = (await dictionaryRows(destDir, config)).flatMap((row) => Object.values(row));
    const names = [...packages, ...(await dictionaryNames(destDir, config)), ...table];
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
