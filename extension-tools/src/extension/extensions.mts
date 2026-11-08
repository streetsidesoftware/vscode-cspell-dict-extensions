/**
 * The extensions in `extensions/`: listing them, and picking the one a command works on.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { extensionsDir } from '../helpers/index.mts';

/** An extension in `extensions/`, picked by its folder. */
export interface Extension {
    /** The folder in `extensions/`, e.g. `swedish`. */
    folder: string;
    /** The absolute path of the folder. */
    dir: string;
}

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
 * The extension a command works on: `folder` when it's given, otherwise the folder in `extensions/` that `cwd` is
 * in.
 * @param cwd - where the command was run from. `npm run` starts in the repository root and sets `INIT_CWD`.
 */
export async function pickExtension(
    folder: string | undefined,
    cwd: string = process.env['INIT_CWD'] ?? process.cwd(),
): Promise<Extension> {
    const name = folder ?? folderOf(cwd);
    if (!name) throw new Error('Name the extension with -e <folder>, or run the command in its folder.');
    // Only a folder in `extensions/` itself: `swedish/`, `./swedish` or `..` would reach other paths.
    const folders = (await listExtensionRepoPaths()).map((repoPath) => path.posix.basename(repoPath));
    if (!folders.includes(name)) throw new Error(`"${name}" isn't an extension: no extensions/<folder>/package.json.`);
    return { folder: name, dir: path.join(extensionsDir, name) };
}

/** The folder in `extensions/` that `cwd` is in. */
function folderOf(cwd: string): string | undefined {
    const relative = path.relative(extensionsDir, cwd);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return relative.split(path.sep)[0];
}
