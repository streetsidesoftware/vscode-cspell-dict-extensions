#!/usr/bin/env node

import * as cp from 'child_process';
import * as path from 'path';
import { promises as fs } from 'node:fs';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { Command, CommanderError } from 'commander';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const cacheDirVscodeTest = '.vscode-test';
const cachePath = path.join(root, cacheDirVscodeTest);

async function main() {
    const program = new Command();

    program
        .name('download-vscode')
        .description('Download the specified version of VSCode for testing.')
        .arguments('[extension-path]', 'Directory of the extension to test.')
        .option('--vscode-version', `The version of VSCode to use.`, 'stable')
        .showHelpAfterError(true)
        .action(downloader);

    try {
        await program.parseAsync();
    } catch (err) {
        if (err instanceof CommanderError) {
            console.error('%s', chalk.red(err.message));
        } else {
            console.error(err);
        }
        process.exitCode = 1;
    }
}

async function downloader(extensionDevelopmentPath, options) {
    if (extensionDevelopmentPath) {
        extensionDevelopmentPath = path.resolve(extensionDevelopmentPath);

        const hasPackage = await fileExists(path.join(extensionDevelopmentPath, 'package.json'));

        if (!hasPackage) {
            throw new CommanderError(1, 'ENOENT', 'Extension "package.json" is missing.');
        }
    }

    const { vscodeVersion: version = 'stable' } = options;

    await fs.mkdir(cachePath, { recursive: true });

    const vscodeExecutablePath = await downloadAndUnzipVSCode({ cachePath, version });
    const [cliPath, ...rawArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const args = rawArgs.filter((arg) => !arg.startsWith('--extensions-dir='));
    args.push(`--extensions-dir=${cachePath}`);

    console.error('VSCode downloaded to: %o', { vscodeExecutablePath, cliArgs: args });

    // Use cp.spawn / cp.exec for custom setup
    const result = cp.spawnSync(cliPath, [...args, '--install-extension', 'streetsidesoftware.code-spell-checker'], {
        encoding: 'utf-8',
    });

    console.error('Install Extension: \n%s%s', result.stdout, result.stderr);
    if (result.error) {
        console.error('Error: %s', result.error.message);
        process.exitCode = 1;
        return;
    }

    console.log('%s', JSON.stringify({ vscodeExecutablePath }));

    console.error('done.');
}

async function fileExists(filePath) {
    try {
        const s = await fs.stat(filePath);
        return s.isFile();
    } catch (e) {
        return false;
    }
}

main();
