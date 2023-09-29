#!/usr/bin/env node

import * as cp from 'child_process';
import * as path from 'path';
import { promises as fs } from 'node:fs';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { Command } from 'commander';
import { fileURLToPath } from 'url';

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
        .arguments('<extension-path>', 'Directory of the extension to test.')
        .option('--vscode-version', `The version of VSCode to use.`, 'stable')
        .showHelpAfterError()
        .action(testRunner);

    await program.parseAsync();
}

async function testRunner(extensionDevelopmentPath, options) {
    try {
        extensionDevelopmentPath = path.resolve(extensionDevelopmentPath);
        const { vscodeVersion: version = 'stable' } = options;
        const extensionTestsPath = path.resolve(__dirname, './suite/index.cjs');

        await fs.mkdir(cachePath, { recursive: true });

        const vscodeExecutablePath = await downloadAndUnzipVSCode({ cachePath, version });
        const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

        // Delete `.vscode-test` to prevent socket issues (based upon the current directory)
        await fs.rm(cacheDirVscodeTest, { recursive: true, force: true });

        // Use cp.spawn / cp.exec for custom setup
        cp.spawnSync(cliPath, [...args, '--install-extension', 'streetsidesoftware.code-spell-checker'], {
            encoding: 'utf-8',
            stdio: 'inherit',
        });

        // Run the extension test
        await runTests({
            // Use the specified `code` executable
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath,
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
