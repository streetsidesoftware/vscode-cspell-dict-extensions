#!/usr/bin/env node

// @ts-check

import * as path from 'path';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { Command, CommanderError } from 'commander';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import assert from 'node:assert';
import { installExtension, installFailure } from './lib/installExtension.mjs';

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
        .option('--retries <count>', 'Number of times to retry a failed test run.', (v) => parseInt(v, 10), 2)
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
    // `runTests` passes `process.env` to VSCode. If this runs from inside a VSCode process (e.g. an extension host),
    // `ELECTRON_RUN_AS_NODE` makes VSCode start as plain Node and fail with `bad option: --user-data-dir`.
    delete process.env.ELECTRON_RUN_AS_NODE;

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
    const extensionsDirArg = `--extensions-dir=${path.join(cachePath, 'extensions')}`;
    args.push(extensionsDirArg);

    if (!options.vscodePath) {
        // Delete `<cwd>/.vscode-test`, NOT the download cache at `cachePath`. `@vscode/test-electron` defaults the
        // CLI's `--user-data-dir` to `<cwd>/.vscode-test/user-data`, so this clears what earlier extension installs
        // left behind (including stale sockets). `cachePath` holds the VSCode build downloaded above.
        await fs.rm(cacheDirVscodeTest, { recursive: true, force: true });

        const result = installExtension(cliPath, args, 'streetsidesoftware.code-spell-checker', { stdio: 'inherit' });
        const failure = installFailure(result);
        if (failure) {
            throw new Error(`Failed to install Code Spell Checker: ${failure}`);
        }
    }

    // Pass absolute paths. The extension host's current directory is the extension on Linux and macOS,
    // but the VSCode install directory on Windows.
    const extensionTestsEnv = {
        SAMPLE_TEST_DOCUMENT: path.resolve(extensionDevelopmentPath, options.sample),
        EXTENSION_DEVELOPMENT_PATH: extensionDevelopmentPath,
    };

    // VSCode creates its IPC socket inside the user data dir. Keep the path short, because
    // macOS limits socket paths to 103 characters and a deep checkout (e.g. a git worktree) exceeds it.
    const tempDir = path.join(os.tmpdir(), 'cspell-dict-');

    // VSCode exits with code 1 if its window becomes unresponsive while running tests from the CLI.
    // This happens randomly on CI runners during startup, so retry with a fresh user data dir.
    const maxAttempts = 1 + Math.max(0, options.retries);

    for (let attempt = 1; ; ++attempt) {
        const userDataDir = await fs.mkdtemp(tempDir);

        console.log('runner info: %o', {
            attempt: `${attempt} of ${maxAttempts}`,
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
                launchArgs: ['--user-data-dir', userDataDir, extensionsDirArg, '--disable-gpu'],
            });
            return;
        } catch (err) {
            if (attempt >= maxAttempts) throw err;
            console.error('%s', chalk.yellow(`Test run failed (attempt ${attempt} of ${maxAttempts}), retrying...`));
        } finally {
            // On Windows, VSCode helper processes can hold files open briefly after exit (EBUSY).
            await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5 });
        }
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
