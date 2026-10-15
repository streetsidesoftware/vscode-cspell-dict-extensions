import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';

import { Command } from 'commander';

import { inquirerPrompter } from './prompt.mts';
import { askQuestions } from './questions.mts';
import { writeExtension } from './writeExtension.mts';

const genName = 'generator-cspell-dicts-extensions';

interface Options {
    skipInstall?: boolean;
}

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
        .option('--skip-install', 'do not run npm install or prettier')
        .showHelpAfterError(true)
        .action(generate);

    await program.parseAsync(argv);
}

async function generate(name: string | undefined, options: Options): Promise<void> {
    let root = process.cwd();
    if (path.basename(root) === genName) {
        root = path.dirname(root);
    }

    console.log(styleText('bold', '\nWelcome to the VS Code Spelling Dictionary Extension generator!\n'));

    const answers = await askQuestions(inquirerPrompter, name);

    let destDir = root;
    if (path.basename(root) !== answers.name) {
        console.log('Creating Folder: ' + answers.name);
        destDir = path.resolve(root, answers.target);
        await mkdir(destDir, { recursive: true });
    }

    await writeExtension(destDir, answers, {
        confirmOverwrite: (file) => inquirerPrompter.confirm(`Overwrite ${file}?`, true),
        log: (message) => console.log(message),
    });

    if (options.skipInstall) return;

    if (answers.dictionarySrc) {
        exec('npm', ['install', '-S', answers.dictionarySrc], destDir);
        exec('npx', ['prettier', '-w', '**/*.{yaml,json,ts,md}'], destDir);
    }
    exec('npm', ['install'], destDir);
}

function exec(command: string, args: string[], cwd: string): void {
    console.log(styleText('gray', `> ${command} ${args.join(' ')}`));
    // On Windows, npm and npx are batch files and need a shell.
    const isWindows = process.platform === 'win32';
    const result = isWindows
        ? spawnSync([command, ...args.map((a) => `"${a}"`)].join(' '), { cwd, stdio: 'inherit', shell: true })
        : spawnSync(command, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}
