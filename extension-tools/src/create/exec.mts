import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';

/**
 * Find npm's command line script, so npm runs with Node directly instead of through a shell. On Windows, `npm` is a
 * batch file that only runs in a shell, and a shell would interpret the arguments.
 */
export function findNpmCli(): string | undefined {
    const nodeDir = path.dirname(process.execPath);
    const candidates = [
        // Set by `npm run`.
        process.env['npm_execpath'],
        // Where Node installs npm: next to node.exe on Windows, in ../lib on other systems.
        path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
    return candidates.find((file) => !!file && /npm-cli\.c?js$/.test(file) && existsSync(file));
}

/**
 * Run npm, showing its output. Throws when it fails.
 */
export function npm(args: string[], cwd: string): void {
    console.log(styleText('gray', `> npm ${args.join(' ')}`));
    const cli = findNpmCli();
    if (!cli && process.platform === 'win32') {
        throw new Error('Could not find npm. Run the generator with: npm run create:extension');
    }
    const result = cli
        ? spawnSync(process.execPath, [cli, ...args], { cwd, stdio: 'inherit' })
        : spawnSync('npm', args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status) throw new Error(`npm ${args.join(' ')} failed with exit code ${result.status}`);
}

/**
 * Run npm quietly, and return what it printed and its exit code. A failing exit code isn't an error: some tools, such
 * as cspell, exit 1 when they find something.
 */
export function npmOutput(args: string[], cwd: string): { stdout: string; stderr: string; status: number | null } {
    const cli = findNpmCli();
    const options = { cwd, encoding: 'utf8' as const };
    const result = cli ? spawnSync(process.execPath, [cli, ...args], options) : spawnSync('npm', args, options);
    if (result.error) throw result.error;
    return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}
