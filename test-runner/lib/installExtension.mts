import * as cp from 'node:child_process';

/**
 * Install an extension using the VSCode CLI.
 *
 * On Windows the CLI is `bin/code.cmd`. Node can only run `.cmd` files through a shell (CVE-2024-27980),
 * so the command and its arguments are quoted to survive paths with spaces.
 *
 * @param cliPath - the VSCode CLI from `resolveCliArgsFromVSCodeExecutablePath`.
 * @param args - arguments for the CLI, e.g. `--extensions-dir=...`.
 * @param extensionId - the extension to install.
 * @param options - extra options for `spawnSync`.
 */
export function installExtension(
    cliPath: string,
    args: string[],
    extensionId: string,
    options: cp.SpawnSyncOptions = {},
): cp.SpawnSyncReturns<string> {
    const shell = process.platform === 'win32';
    const quote = (s: string) => (shell ? `"${s}"` : s);
    const cmdArgs = [...args, '--install-extension', extensionId].map(quote);

    return cp.spawnSync(quote(cliPath), cmdArgs, { ...options, encoding: 'utf-8', shell });
}

/**
 * @returns a description of the failure, or `undefined` if the install succeeded.
 */
export function installFailure(result: cp.SpawnSyncReturns<string>): string | undefined {
    if (result.error) return result.error.message;
    if (result.signal) return `killed by ${result.signal}`;
    if (result.status !== 0) return `exit code ${result.status}`;
    return undefined;
}
