#!/usr/bin/env node

import * as path from 'path';
import { promises as fs } from 'node:fs';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';
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
    console.log('VSCode downloaded to:', vscodeExecutablePath);
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
