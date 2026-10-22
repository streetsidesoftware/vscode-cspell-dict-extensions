import fs from 'node:fs/promises';
import path from 'node:path';

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');

/**
 * @param file - a repo path, or an absolute path.
 */
export async function readJson<T = unknown>(file: string): Promise<T> {
    return JSON.parse(await fs.readFile(path.resolve(repoRoot, file), 'utf8'));
}

export async function writeJson(file: string, value: unknown): Promise<void> {
    await fs.writeFile(path.resolve(repoRoot, file), JSON.stringify(value, null, 4) + '\n');
}

export async function exists(file: string): Promise<boolean> {
    try {
        await fs.access(path.resolve(repoRoot, file));
        return true;
    } catch {
        return false;
    }
}
