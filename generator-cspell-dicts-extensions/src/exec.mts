import { spawnSync } from 'node:child_process';
import { styleText } from 'node:util';

/**
 * Run a command, showing its output. Throws when it fails.
 */
export function exec(command: string, args: string[], cwd: string): void {
    console.log(styleText('gray', `> ${command} ${args.join(' ')}`));
    // On Windows, npm and npx are batch files and need a shell.
    // The arguments are quoted here, because Node does not quote them for a shell (DEP0190).
    const isWindows = process.platform === 'win32';
    const result = isWindows
        ? spawnSync([command, ...args.map((a) => `"${a}"`)].join(' '), { cwd, stdio: 'inherit', shell: true })
        : spawnSync(command, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}
