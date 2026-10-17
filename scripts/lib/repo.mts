import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Only `node:` modules here: `list-extensions.mts` runs in workflows before `npm ci`.
 */

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');

/**
 * The extensions: the directories in `extensions/` that have a `package.json`, relative to the repository root,
 * e.g. `extensions/swedish`, sorted.
 */
export async function listExtensionDirs(): Promise<string[]> {
    const dirs: string[] = [];
    for await (const pkgFile of fs.glob('*/package.json', { cwd: path.join(repoRoot, 'extensions') })) {
        dirs.push(`extensions/${path.dirname(pkgFile)}`);
    }
    return dirs.sort();
}

/**
 * The `engines.vscode` of the root `package.json`, which every extension gets.
 */
export async function readVscodeEngine(): Promise<string> {
    const pkg = await readJson<{ engines?: { vscode?: string } }>('package.json');
    const vscodeEngine = pkg.engines?.vscode;
    if (!vscodeEngine) throw new Error('package.json: "engines.vscode" is missing.');
    return vscodeEngine;
}

export async function readJson<T = unknown>(file: string): Promise<T> {
    return JSON.parse(await fs.readFile(path.resolve(repoRoot, file), 'utf8'));
}

/** Write JSON indented with 4 spaces, like `jq --indent 4`. */
export async function writeJson(file: string, value: unknown): Promise<void> {
    await fs.writeFile(path.resolve(repoRoot, file), JSON.stringify(value, null, 4) + '\n');
}

/** Run a command in the repository root and fail if it fails. */
export function run(command: string, args: string[]): void {
    execFileSync(command, args, { cwd: repoRoot, stdio: 'inherit' });
}
