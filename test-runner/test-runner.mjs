#!/usr/bin/env node

// @ts-check

import * as cp from 'child_process';
import * as path from 'path';
import { promises as fs } from 'node:fs';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { Command, CommanderError } from 'commander';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import assert from 'node:assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');
const cacheDirVscodeTest = '.vscode-test';
const cachePath = path.join(root, cacheDirVscodeTest);

async function main() {
    const program = new Command();

    program
        .name('test-runner')
        .description('VSCode test running for testing CSpell addon extensions.')
        .arguments('<extension-path>')
        .option('--vscode-version <version>', `The version of VSCode to use.`, 'stable')
        .option('--sample <path-to-sample-doc>', 'Specify a sample document', 'samples/seattle.md')
        .option('--vscode-path <path-to-vscode>', 'Use the specified version of VSCode.')
        .showHelpAfterError(true)
        .action(testRunner);

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

async function testRunner(extensionDevelopmentPath, options) {
    extensionDevelopmentPath = path.resolve(extensionDevelopmentPath);

    const hasPackage = await fileExists(path.join(extensionDevelopmentPath, 'package.json'));
    const hasSample = await fileExists(path.join(extensionDevelopmentPath, options.sample));

    if (!hasPackage) {
        throw new CommanderError(1, 'ENOENT', 'Extension "package.json" is missing.');
    }

    if (!hasSample) {
        throw new CommanderError(1, 'ENOENT', `Sample "${options.sample}" is missing.`);
    }

    if (options.vscodePath) {
        assert(await fileExists(options.vscodePath), `VSCode path "${options.vscodePath}" does not exist.`);
    }

    const { vscodeVersion: version = 'stable' } = options;
    const extensionTestsPath = path.resolve(__dirname, './suite/index.cjs');

    await fs.mkdir(cachePath, { recursive: true });

    const vscodeExecutablePath = options.vscodePath || (await downloadAndUnzipVSCode({ cachePath, version }));
    const [cliPath, ...rawArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const args = rawArgs.filter((arg) => !arg.startsWith('--extensions-dir='));
    const extensionsDirArg = `--extensions-dir=${cachePath}/extensions`;
    args.push(extensionsDirArg);

    if (!options.vscodePath) {
        // Delete `.vscode-test` to prevent socket issues (based upon the current directory)
        await fs.rm(cacheDirVscodeTest, { recursive: true, force: true });

        // Use cp.spawn / cp.exec for custom setup
        cp.spawnSync(cliPath, [...args, '--install-extension', 'streetsidesoftware.code-spell-checker'], {
            encoding: 'utf-8',
            stdio: 'inherit',
        });
    }

    const extensionTestsEnv = {
        SAMPLE_TEST_DOCUMENT: options.sample,
    };

    const tempDir = path.join(root, 'temp/.vscode-test/');
    await fs.mkdir(tempDir, { recursive: true });
    const userDataDir = await fs.mkdtemp(tempDir);

    console.log('runner info: %o', {
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv,
        userDataDir,
    });

    try {
        // Run the extension test
        await runTests({
            // Use the specified `code` executable
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
            extensionTestsEnv,
            launchArgs: ['--user-data-dir', userDataDir, extensionsDirArg],
        });
    } finally {
        await fs.rm(userDataDir, { recursive: true, force: true });
    }
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
