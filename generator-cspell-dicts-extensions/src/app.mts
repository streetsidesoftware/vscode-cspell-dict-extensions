import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import { npm } from './exec.mts';
import { findExistingExtensions } from './existingExtensions.mts';
import { fetchJson } from './npm.mts';
import { inquirerPrompter, noPrompter } from './prompt.mts';
import { askQuestions, kinds, type Options } from './questions.mts';
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
        .argument('[package]', 'the @cspell/dict-* or @cspell/parser-* package, i.e. @cspell/dict-sv')
        .addOption(new Option('--kind <kind>', 'the kind of extension; implied by the package').choices(kinds))
        .option('--natural-language', 'the dictionary is a natural language, enabled by locale')
        .option('--no-natural-language', 'the dictionary is a word list, enabled by name')
        .option('--locale <locale>', 'the locale that enables a natural language, i.e. sv-SE')
        .option('--native-name <name>', 'the language in the language itself, i.e. "svenska" (default: from Intl)')
        .option('--name <name>', 'the extension name: its directory in extensions/ and its command ID prefix')
        .option('--friendly-name <name>', 'the name shown to people, i.e. "Swedish"')
        .option('--display-name <name>', 'the Marketplace name (default: "<friendly name> - Code Spell Checker")')
        .option('--description <text>', 'the Marketplace description (required for a parser)')
        .option('-y, --yes', 'never ask: use the defaults, and fail when a required value is missing')
        .showHelpAfterError(true)
        .action(generate);

    await program.parseAsync(argv);
}

async function generate(packageName: string | undefined, options: Omit<Options, 'package'>): Promise<void> {
    if (!options.yes) {
        console.log(styleText('bold', '\nWelcome to the VS Code Spelling Dictionary Extension generator!\n'));
    }

    const answers = await askQuestions(
        { ...options, package: packageName },
        {
            prompter: options.yes ? noPrompter : inquirerPrompter,
            fetchJson,
            extensionsDir,
            existing: await findExistingExtensions(extensionsDir),
            log: (message) => console.log(message),
        },
    );

    const destDir = path.join(extensionsDir, answers.name);
    console.log(`Creating extensions/${answers.name}`);
    await writeExtension(destDir, answers, { log: (message) => console.log(message) });

    npm(['exec', '--', 'prettier', '--write', '--log-level', 'warn', 'extension.config.json'], destDir);
    npm(['install', '-S', answers.packageName], destDir);
    // The shared package.json fields, then the files the sync owns or derives.
    npm(['run', 'tool:fix-extensions'], repoRoot);
    npm(['run', 'sync:extensions', '--', answers.name], repoRoot);

    console.log(styleText('green', `\nCreated extensions/${answers.name}`));
}
