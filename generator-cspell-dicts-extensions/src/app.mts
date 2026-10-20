import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import { type CSpellPackage, fetchCSpellPackages } from '../../scripts/lib/cspellPackages.mts';
import { findExistingExtensions } from '../../scripts/lib/existingExtensions.mts';
import { fetchArticle } from '../../scripts/lib/wikipedia.mts';
import { npm } from './exec.mts';
import { languageOf } from './locales.mts';
import { inquirerPrompter, noPrompter } from './prompt.mts';
import { askQuestions, defaultLicense, kinds, type Options } from './questions.mts';
import { askSampleFile, defaultSampleTitle, fileSamples, languageSample, starterMarker } from './sample.mts';
import { writeExtension } from './writeExtension.mts';

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
        .argument('[name]', 'the extension name: its directory in extensions/ and its command ID prefix, i.e. swedish')
        .option(
            '-p, --package <package>',
            'a @cspell/dict-* or @cspell/parser-* package to include, i.e. @cspell/dict-sv; repeat it for several',
            (value: string, previous: string[] | undefined) => [...(previous ?? []), value],
        )
        .addOption(new Option('--kind <kind>', 'the kind of extension (default: from the packages)').choices(kinds))
        .option('--locale <locale>', 'the locale that enables a language, i.e. sv-SE (default: from the packages)')
        .option('--native-name <name>', 'the language in the language itself, i.e. "svenska" (default: from Intl)')
        .option('--friendly-name <name>', 'the name shown to people (default: from the name, i.e. "Swedish")')
        .option('--display-name <name>', 'the Marketplace name (default: "<friendly name> - Code Spell Checker")')
        .option('--description <text>', 'the Marketplace description (required for a parser)')
        .option('--license <spdx>', `the extension's license (default: ${defaultLicense})`)
        .option(
            '--sample-title <title>',
            `the Wikipedia article for a language's sample, in English or the language (default: ${defaultSampleTitle})`,
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
    }: Omit<Options, 'name' | 'packages'> & { package?: string[]; sampleTitle?: string; sampleFile?: string[] },
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
          ? [await languageSample(languageOf(answers.locale), sampleTitle ?? defaultSampleTitle, sampleContext)]
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

    npm(['exec', '--', 'prettier', '--write', '--log-level', 'warn', 'extension.config.json'], destDir);
    npm(['install', '-S', ...answers.packages], destDir);
    // The shared package.json fields, then the files the sync owns or derives.
    npm(['run', 'tool:fix-extensions'], repoRoot);
    npm(['run', 'sync:extensions', '--', answers.name], repoRoot);
    // Record the runtime dependency the sync added in package-lock.json.
    npm(['install'], destDir);

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

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}
