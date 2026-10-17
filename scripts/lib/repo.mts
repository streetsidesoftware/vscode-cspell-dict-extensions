import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Only `node:` modules here: `list-extensions.mts` runs in workflows before `npm ci`.
 */

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');

/**
 * The directories in `extensions/` that have a `package.json`, relative to the repository root, i.e.
 * `extensions/swedish`.
 *
 * They are sorted by the path of their `package.json`, like the shell glob `extensions/*\/package.json`, so
 * `extensions/british-english-ise` comes before `extensions/british-english`.
 */
export async function listExtensionDirs(): Promise<string[]> {
    const names: string[] = [];
    for await (const pkgFile of fs.glob('*/package.json', { cwd: path.join(repoRoot, 'extensions') })) {
        names.push(path.dirname(pkgFile));
    }
    return names
        .map((name) => `extensions/${name}/package.json`)
        .sort(compareCodePoints)
        .map((pkgFile) => path.posix.dirname(pkgFile));
}

/** Compare strings by code point, like `jq`'s `sort` and the `C` locale. */
export function compareCodePoints(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
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
