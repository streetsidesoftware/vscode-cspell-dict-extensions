/**
 * Reading any package's `package.json`: an extension's, an installed dictionary's, or the runtime's.
 */

import path from 'node:path';

import { readJson } from './repo.mts';

/** The fields of a `package.json` that every package has, and the rest as they are. */
export interface PackageJson {
    name: string;
    version: string;
    engines?: { [engine: string]: string };
    [field: string]: unknown;
}

/**
 * @param dir - the package's directory, as an absolute path or a repo path.
 * @typeParam T - what the caller knows about the package, such as an extension's fields.
 */
export async function readPackageJson<T extends PackageJson = PackageJson>(dir: string): Promise<T> {
    return readJson<T>(path.join(dir, 'package.json'));
}

/**
 * The `engines.vscode` of the runtime: the VS Code version its code needs, which every extension gets.
 */
export async function readVscodeEngine(): Promise<string> {
    const runtimeDir = 'extension-runtime';
    const vscodeEngine = (await readPackageJson(runtimeDir)).engines?.['vscode'];
    if (!vscodeEngine) throw new Error(`${runtimeDir}/package.json: "engines.vscode" is missing.`);
    return vscodeEngine;
}
