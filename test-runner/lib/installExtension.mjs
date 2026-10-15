import * as cp from 'node:child_process';

/**
 * Install an extension using the VSCode CLI.
 *
 * On Windows the CLI is `bin/code.cmd`. Node can only run `.cmd` files through a shell (CVE-2024-27980),
 * so the command and its arguments are quoted to survive paths with spaces.
 *
 * @param {string} cliPath - the VSCode CLI from `resolveCliArgsFromVSCodeExecutablePath`.
 * @param {string[]} args - arguments for the CLI, e.g. `--extensions-dir=...`.
 * @param {string} extensionId - the extension to install.
 * @param {import('node:child_process').SpawnSyncOptions} [options] - extra options for `spawnSync`.
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
export function installExtension(cliPath, args, extensionId, options = {}) {
    const shell = process.platform === 'win32';
    const quote = (s) => (shell ? `"${s}"` : s);
    const cmdArgs = [...args, '--install-extension', extensionId].map(quote);

    return cp.spawnSync(quote(cliPath), cmdArgs, { encoding: 'utf-8', ...options, shell });
}

/**
 * @param {import('node:child_process').SpawnSyncReturns<string>} result
 * @returns {string | undefined} a description of the failure, or `undefined` if the install succeeded.
 */
export function installFailure(result) {
    if (result.error) return result.error.message;
    if (result.status !== 0) return `exit code ${result.status ?? result.signal}`;
    return undefined;
}
