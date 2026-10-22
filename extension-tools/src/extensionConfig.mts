/**
 * `extension.config.json`: every read and write of it goes through here.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { type ExtensionConfigValidator, readExtensionConfigValidator } from './extensionSchema.mts';
import { format } from './format.mts';
import { exists, extensionRepoPath, extensionsDir, readJson } from './repo.mts';

export const configFileName = 'extension.config.json';

/** An extension in `extensions/`, picked by its folder. */
export interface Extension {
    /** The folder in `extensions/`, e.g. `swedish`. */
    folder: string;
    /** The absolute path of the folder. */
    dir: string;
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
    const dir = path.join(extensionsDir, name);
    if (!(await exists(path.join(dir, 'package.json')))) throw new Error(`extensions/${name}/package.json not found.`);
    return { folder: name, dir };
}

/** The folder in `extensions/` that `cwd` is in. */
function folderOf(cwd: string): string | undefined {
    const relative = path.relative(extensionsDir, cwd);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return relative.split(path.sep)[0];
}

/** Read an extension's `extension.config.json`, checked against the schema. */
export async function readConfig(extensionDir: string, validate?: ExtensionConfigValidator): Promise<ExtensionConfig> {
    const file = path.join(extensionDir, configFileName);
    const repoFile = `${extensionRepoPath(extensionDir)}/${configFileName}`;
    if (!(await exists(file))) throw new Error(`${repoFile} not found: the extension is maintained by hand.`);
    return (validate ?? (await readExtensionConfigValidator()))(await readJson(file), repoFile);
}

/** Write an extension's `extension.config.json`, after checking it against the schema. */
export async function writeConfig(extensionDir: string, config: ExtensionConfig): Promise<void> {
    const file = path.join(extensionDir, configFileName);
    (await readExtensionConfigValidator())(config, `${extensionRepoPath(extensionDir)}/${configFileName}`);
    await fs.writeFile(file, await format(file, JSON.stringify(config, null, 4) + '\n'));
}
