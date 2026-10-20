// cspell:ignore elisp

import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import type { ExtensionConfig } from '../../extension-runtime/src/config.ts';
import { type CSpellPackage, fetchCSpellPackages } from '../../scripts/lib/cspellPackages.mts';
import { findExistingExtensions } from '../../scripts/lib/existingExtensions.mts';
import { describeFileTypes, dictionaryStates, sampleTurnsOn } from '../../scripts/lib/syncExtension.mts';
import { fetchArticle } from '../../scripts/lib/wikipedia.mts';
import { npm, npmOutput } from './exec.mts';
import { languageOf } from './locales.mts';
import { inquirerPrompter, noPrompter } from './prompt.mts';
import { type Answers, askQuestions, defaultLicense, kinds, type Options, UsageError } from './questions.mts';
import {
    askSampleFile,
    defaultSampleTitle,
    fileSamples,
    languageSamples,
    type Sample,
    starterMarker,
} from './sample.mts';
import {
    dictionaryCommands,
    extensionConfig,
    installedSentence,
    json,
    readme,
    writeExtension,
} from './writeExtension.mts';

/** The repository root. */
const repoRoot = path.resolve(import.meta.dirname, '../..');
const extensionsDir = path.join(repoRoot, 'extensions');

/**
 * Run the generator.
 * @param argv - the command line, including `node` and the script.
 */
export async function run(argv: string[] = process.argv): Promise<void> {
    const program = new Command();
    program
        .name('create:extension')
        .description('Generate a VS Code extension for Code Spell Checker.')
        .argument('[name]', 'the extension name: its directory in extensions/ and its command ID prefix, e.g. swedish')
        .option(
            '-p, --package <package>',
            'a @cspell/dict-* or @cspell/parser-* package to include, e.g. @cspell/dict-sv; repeat it for several',
            (value: string, previous: string[] | undefined) => [...(previous ?? []), value],
        )
        .addOption(new Option('--kind <kind>', 'the kind of extension (default: from the packages)').choices(kinds))
        .option('--locale <locale>', 'the locale that enables a language, e.g. sv-SE (default: from the packages)')
        .option('--native-name <name>', 'the language in the language itself, e.g. "svenska" (default: from Intl)')
        .option(
            '--friendly-name <name>',
            'the name shown in VS Code and the Marketplace (default: from the name, e.g. "Swedish")',
        )
        .option('--display-name <name>', 'the Marketplace name (default: "<friendly name> - Code Spell Checker")')
        .option('--description <text>', 'the Marketplace description (required for a parser)')
        .option('--license <spdx>', `the extension's license (default: ${defaultLicense})`)
        .option(
            '--sample-title <title>',
            `a Wikipedia article for a language's sample, in English or the language; repeat it for several (default: ${defaultSampleTitle})`,
            (value: string, previous: string[] | undefined) => [...(previous ?? []), value],
        )
        .addOption(
            new Option(
                '--sample-file <file>',
                'a sample to copy into samples/, instead of the default; repeat it for several, and the VS Code test opens the first',
            )
                .argParser((value: string, previous: string[] | undefined) => [...(previous ?? []), value])
                .conflicts('sampleTitle'),
        )
        .option('-f, --force', 'replace the extension directory when it exists')
        .option('-y, --yes', 'never ask: use the defaults, and fail when a required value is missing')
        .showHelpAfterError(true)
        .action(generate);

    await program.parseAsync(argv);
}

async function generate(
    name: string | undefined,
    {
        package: packages,
        sampleTitle,
        sampleFile: sampleFiles,
        ...options
    }: Omit<Options, 'name' | 'packages'> & { package?: string[]; sampleTitle?: string[]; sampleFile?: string[] },
): Promise<void> {
    if (!options.yes) {
        console.log(styleText('bold', '\nWelcome to the VS Code Spelling Dictionary Extension generator!\n'));
    }

    const prompter = options.yes ? noPrompter : inquirerPrompter;
    const log = (message: string) => console.log(message);
    const answers = await askQuestions(
        { ...options, name, packages },
        {
            prompter,
            packages: await readPackageLists(),
            extensionsDir,
            existing: await findExistingExtensions(extensionsDir),
            log,
        },
    );

    const sampleContext = {
        prompter,
        yes: !!options.yes,
        // `npm run` starts in the repository root; INIT_CWD is where it was run from.
        cwd: process.env['INIT_CWD'] ?? process.cwd(),
        fetchArticle,
        log,
    };
    const samples = sampleFiles
        ? await fileSamples(sampleFiles, sampleContext.cwd)
        : answers.kind === 'language'
          ? await languageSamples(languageOf(answers.locale), sampleTitle, sampleContext)
          : await askSampleFile(answers.friendlyName, sampleContext);
    const [firstSample, ...moreSamples] = samples;
    if (!firstSample) throw new Error('No sample.');

    const destDir = path.join(extensionsDir, answers.name);
    if (options.force && existsSync(destDir)) {
        console.log(`Removing extensions/${answers.name}`);
        await rm(destDir, { recursive: true });
    }
    console.log(`Creating extensions/${answers.name}`);
    await writeExtension(destDir, answers, [firstSample, ...moreSamples], { log });

    npm(['install', '-S', ...answers.packages], destDir);
    const config = extensionConfig(answers, firstSample.file);
    if (answers.kind === 'wordList') {
        // The samples the user gave, on the command line or at the prompt; not the starter sample.
        const given = samples.filter((sample) => !sample.text.includes(starterMarker));
        await setUpWordList(destDir, answers, config, given);
    }
    npm(['exec', '--', 'prettier', '--write', '--log-level', 'warn', 'extension.config.json'], destDir);
    // The shared package.json fields, then the files the sync owns or derives.
    npm(['run', 'tool:fix-extensions'], repoRoot);
    npm(['run', 'sync:extensions', '--', answers.name], repoRoot);
    // Record the runtime dependency the sync added in package-lock.json.
    npm(['install'], destDir);
    await addNameWords(destDir, answers, config);

    console.log(styleText('green', `\nCreated extensions/${answers.name}`));
    if (firstSample.text.includes(starterMarker)) {
        console.log(styleText('yellow', `Replace the text in extensions/${answers.name}/${firstSample.file}.`));
    }
}

async function readPackageLists(): Promise<CSpellPackage[] | undefined> {
    try {
        return await fetchCSpellPackages();
    } catch (e) {
        console.log(styleText('yellow', `Could not fetch the package lists (${errorMessage(e)}).`));
        return undefined;
    }
}

/**
 * A word list's setup, from its installed packages, which alone tell what turns each dictionary on:
 * - a given sample must be a file that turns a dictionary on, such as `.el` for `@cspell/dict-elisp`;
 * - each dictionary gets commands to turn it on and off;
 * - a dictionary that's off until turned on, such as `@cspell/dict-vim`'s, is turned on for the samples;
 * - the README says when each dictionary is on.
 * @param given - the samples the user gave, with `--sample-file` or at the prompt.
 */
async function setUpWordList(
    destDir: string,
    answers: Answers,
    config: ExtensionConfig,
    given: readonly Sample[],
): Promise<void> {
    const dictionaries = await dictionaryStates(destDir, config);
    const wrong = given.filter((sample) => !sampleTurnsOn(sample.file, dictionaries));
    if (wrong.length) {
        await rm(destDir, { recursive: true });
        const when = dictionaries.map((d) => `${d.name}: ${describeFileTypes(d).replaceAll('`', '')}`).join('; ');
        throw new UsageError(
            `${wrong.map((s) => path.basename(s.file)).join(', ')} turns on no dictionary of this extension (${when}). ` +
                "Give a --sample-file of one of those file types. The extension's folder was removed.",
        );
    }
    const commands = dictionaryCommands(
        config.name,
        dictionaries.map((d) => d.name),
    );
    await writeFile(path.join(destDir, 'extension.config.json'), json({ ...config, commands }));
    const off = dictionaries.filter((d) => d.off).map((d) => d.name);
    if (off.length) {
        console.log(`Off until turned on: ${off.join(', ')}`);
        await writeFile(path.join(destDir, 'samples/cspell.json'), json({ dictionaries: off }));
    }
    await writeFile(path.join(destDir, 'README.md'), readme(answers, installedSentence(dictionaries)));
}

/**
 * Add the words of the dictionary and package names that cspell doesn't know, such as `elisp`, to `words` in the
 * extension's `cspell.config.yaml`, so its own spell check passes.
 */
async function addNameWords(destDir: string, answers: Answers, config: ExtensionConfig): Promise<void> {
    const names = [...answers.packages, ...(await dictionaryStates(destDir, config)).map((d) => d.name)];
    const nameWords = new Set(names.flatMap((n) => n.toLowerCase().split(/[^\p{L}]+/u)).filter(Boolean));
    const relative = path.relative(repoRoot, destDir).split(path.sep).join('/');
    const { stdout, stderr, status } = npmOutput(
        [
            'exec',
            '--',
            'cspell',
            '--no-progress',
            '--no-summary',
            '--words-only',
            '--unique',
            '--dot',
            `${relative}/**`,
        ],
        repoRoot,
    );
    if (status !== 0 && status !== 1) {
        console.log(styleText('yellow', `Could not spell check the extension's files: ${stderr.trim()}`));
        return;
    }
    const unknown = unique(stdout.split(/\r?\n/).map((w) => w.trim()))
        .filter((w) => nameWords.has(w.toLowerCase()))
        .toSorted();
    if (!unknown.length) return;
    const file = path.join(destDir, 'cspell.config.yaml');
    const yaml = await readFile(file, 'utf8');
    if (/^words:/m.test(yaml)) {
        console.log(
            styleText('yellow', `Add to words in extensions/${answers.name}/cspell.config.yaml: ${unknown.join(', ')}`),
        );
        return;
    }
    console.log(`Words from the package names, added to cspell.config.yaml: ${unknown.join(', ')}`);
    const words = `words:\n${unknown.map((w) => `  - ${w}\n`).join('')}`;
    await writeFile(file, `${yaml}${yaml.endsWith('\n') ? '' : '\n'}${words}`);
}

function unique(values: string[]): string[] {
    return [...new Set(values)].filter(Boolean);
}

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}
