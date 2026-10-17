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
    const entries = await fs.readdir(path.join(repoRoot, 'extensions'), { withFileTypes: true });
    const pkgFiles: string[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgFile = `extensions/${entry.name}/package.json`;
        if (await exists(path.join(repoRoot, pkgFile))) pkgFiles.push(pkgFile);
    }
    return pkgFiles.sort(compareCodePoints).map((pkgFile) => path.posix.dirname(pkgFile));
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

async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(file);
        return true;
    } catch {
        return false;
    }
}
