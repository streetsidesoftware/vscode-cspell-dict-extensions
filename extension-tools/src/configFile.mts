/**
 * The file `extension.config.json`: the only code that reads or writes it. It uses only `node:` modules, because
 * workflows read the config before `npm ci`. Checking and formatting it are in `extensionConfig.mts`.
 */

import path from 'node:path';

import { exists, readJson, writeIfChanged } from './repo.mts';

export const configFileName = 'extension.config.json';

/** Whether the extension has an `extension.config.json`. One maintained by hand has none. */
export async function hasConfig(extensionDir: string): Promise<boolean> {
    return exists(path.join(extensionDir, configFileName));
}

/** The parsed `extension.config.json`, unchecked. */
export async function readConfigJson(extensionDir: string): Promise<unknown> {
    return readJson(path.join(extensionDir, configFileName));
}

/**
 * Write `extension.config.json`.
 * @param check - only report whether the file would change.
 * @returns whether the file changed.
 */
export async function writeConfigText(extensionDir: string, text: string, check?: boolean): Promise<boolean> {
    return writeIfChanged(path.join(extensionDir, configFileName), text, check);
}
