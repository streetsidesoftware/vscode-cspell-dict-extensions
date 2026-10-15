import path from 'node:path';
import { styleText } from 'node:util';

import { Command } from 'commander';

import { exec } from './exec.mts';
import { inquirerPrompter } from './prompt.mts';
import { askQuestions } from './questions.mts';
import { writeExtension } from './writeExtension.mts';

/** The repository root: `target` is relative to it. */
const repoRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Run the generator.
 * @param argv - the command line, including `node` and the script.
 */
export async function run(argv: string[] = process.argv): Promise<void> {
    const program = new Command();
    program
        .name('create:extension')
        .description('Generate a VS Code spelling dictionary extension.')
        .argument('[name]', 'the default dictionary directory name, i.e. swedish')
        .showHelpAfterError(true)
        .action(generate);

    await program.parseAsync(argv);
}

async function generate(name: string | undefined): Promise<void> {
    console.log(styleText('bold', '\nWelcome to the VS Code Spelling Dictionary Extension generator!\n'));

    const answers = await askQuestions(inquirerPrompter, { root: repoRoot, defaultName: name });

    const destDir = path.resolve(repoRoot, answers.target);
    console.log('Creating Folder: ' + answers.target);
    await writeExtension(destDir, answers, { log: (message) => console.log(message) });

    if (answers.dictionarySrc) {
        exec('npm', ['install', '-S', answers.dictionarySrc], destDir);
        exec('npx', ['prettier', '-w', '**/*.{yaml,json,ts,md}'], destDir);
    }
    exec('npm', ['install'], destDir);
}
