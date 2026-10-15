import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import { createPrompter, createTerminalReadLine } from './prompt.mts';
import { type Answers, askQuestions } from './questions.mts';
import { writeExtension } from './writeExtension.mts';

const genName = 'generator-cspell-dicts-extensions';

const usage = `Usage: npm run create:extension -- [options] [name]

Generate a VS Code spelling dictionary extension.

Arguments:
  name            the default dictionary directory name, i.e. swedish

Options:
  --skip-install  do not run npm install or prettier
  -h, --help      show this help`;

/**
 * Run the generator.
 * @param args - the command line arguments, without `node` and the script.
 */
export async function run(args: string[] = process.argv.slice(2)): Promise<void> {
    const { values, positionals } = parseArgs({
        args,
        allowPositionals: true,
        options: {
            'skip-install': { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
    });

    if (values.help) {
        console.log(usage);
        return;
    }

    let root = process.cwd();
    if (path.basename(root) === genName) {
        root = path.dirname(root);
    }

    console.log(styleText('bold', '\nWelcome to the VS Code Spelling Dictionary Extension generator!\n'));

    const terminal = createTerminalReadLine();
    const prompter = createPrompter(terminal.readLine);

    let answers: Answers;
    let destDir = root;
    try {
        answers = await askQuestions(prompter, positionals[0]);

        if (path.basename(root) !== answers.name) {
            console.log('Creating Folder: ' + answers.name);
            destDir = path.resolve(root, answers.target);
            await mkdir(destDir, { recursive: true });
        }

        await writeExtension(destDir, answers, {
            confirmOverwrite: (file) => prompter.confirm(`Overwrite ${file}?`, true),
            log: (message) => console.log(message),
        });
    } finally {
        // Release stdin before running npm.
        terminal.close();
    }

    if (values['skip-install']) return;

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
