import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Only `node:` modules here: workflows load it before `npm ci`.
 */

export const repoRoot: string = path.resolve(import.meta.dirname, '../../..');
export const extensionsDir: string = path.join(repoRoot, 'extensions');

/** An extension's directory as a repo path, e.g. `extensions/swedish`. */
export function extensionRepoPath(extensionDir: string): string {
    return `extensions/${path.basename(extensionDir)}`;
}

/**
 * @param file - a repo path, or an absolute path.
 */
export async function readJson<T = unknown>(file: string): Promise<T> {
    const target = path.resolve(repoRoot, file);
    try {
        return JSON.parse(await fs.readFile(target, 'utf8'));
    } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
        throw new Error(`${path.relative(repoRoot, target)}: ${e.message}`, { cause: e });
    }
}

export async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(path.resolve(repoRoot, file));
        return true;
    } catch {
        return false;
    }
}

/**
 * Write a file if its content differs.
 * @param check - only report whether it differs.
 * @returns whether the file differs.
 */
export async function writeIfChanged(file: string, content: string, check: boolean | undefined): Promise<boolean> {
    const target = path.resolve(repoRoot, file);
    if ((await readText(target)) === content) return false;
    if (!check) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content);
    }
    return true;
}

async function readText(file: string): Promise<string | undefined> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}
