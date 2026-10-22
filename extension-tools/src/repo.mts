import fs from 'node:fs/promises';
import path from 'node:path';

/*
 * Only `node:` modules here: `api-node-only.mts` exports from it.
 */

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');
export const extensionsDir: string = path.join(repoRoot, 'extensions');
const runtimePackageJson = 'extension-runtime/package.json';

/**
 * The repo paths of the extensions: the directories in `extensions/` that have a `package.json`, sorted.
 *
 * A repo path is relative to the repository root and always uses `/`, e.g. `extensions/swedish`. It works as a file
 * path from the root, and as a path in a URL of the repository.
 */
export async function listExtensionRepoPaths(): Promise<string[]> {
    const repoPaths: string[] = [];
    for await (const pkgFile of fs.glob('*/package.json', { cwd: extensionsDir })) {
        repoPaths.push(`extensions/${path.dirname(pkgFile)}`);
    }
    return repoPaths.sort();
}

/**
 * The `engines.vscode` of the runtime: the VS Code version its code needs, which every extension gets.
 */
export async function readVscodeEngine(): Promise<string> {
    const pkg = await readJson<{ engines?: { vscode?: string } }>(runtimePackageJson);
    const vscodeEngine = pkg.engines?.vscode;
    if (!vscodeEngine) throw new Error(`${runtimePackageJson}: "engines.vscode" is missing.`);
    return vscodeEngine;
}

/**
 * @param file - a repo path, or an absolute path.
 */
export async function readJson<T = unknown>(file: string): Promise<T> {
    return JSON.parse(await fs.readFile(path.resolve(repoRoot, file), 'utf8'));
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
