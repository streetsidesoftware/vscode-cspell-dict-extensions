/**
 * Reading and writing any package's `package.json`: an extension's, an installed dictionary's, or the runtime's.
 */

import path from 'node:path';

import { readJson, writeIfChanged } from './repo.mts';

/**
 * The order of the fields in a `package.json`, taken from `sort-package-json`'s order for the common npm fields and
 * the VS Code extension fields. Fields that aren't listed go after these.
 */
const fieldOrder = [
    // What the package is
    'name',
    'displayName',
    'version',
    'private',
    'description',
    'categories',
    'keywords',
    'homepage',
    'bugs',
    'repository',
    'funding',
    'license',
    'qna',
    // Who makes it
    'author',
    'maintainers',
    'contributors',
    'publisher',
    // How it's loaded
    'sideEffects',
    'type',
    'imports',
    'exports',
    'main',
    'module',
    'browser',
    'types',
    'typesVersions',
    'bin',
    'man',
    'directories',
    'files',
    'workspaces',
    // What it runs and contributes
    'scripts',
    'contributes',
    'activationEvents',
    // What it needs
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'peerDependenciesMeta',
    'optionalDependencies',
    'bundleDependencies',
    'overrides',
    'extensionPack',
    'extensionDependencies',
    'packageManager',
    'engines',
    'devEngines',
    'os',
    'cpu',
    'publishConfig',
    // VS Code Marketplace and packaging
    'icon',
    'galleryBanner',
    'preview',
    'capabilities',
    'extensionKind',
    'sponsor',
    'vsce',
];

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
 * Write a `package.json` as 2-space JSON, with its fields in a fixed order.
 * @param dir - the package's directory, as an absolute path or a repo path.
 * @param options - `check` only reports whether the file would change.
 * @returns whether the file changed.
 */
export async function writePackageJson(
    dir: string,
    pkg: Partial<PackageJson>,
    options: { check?: boolean | undefined } = {},
): Promise<boolean> {
    const text = JSON.stringify(sortFields(pkg), null, 2) + '\n';
    return writeIfChanged(path.join(dir, 'package.json'), text, options.check);
}

/** The fields in the order of `fieldOrder`, then the unlisted ones in alphabetical order. */
function sortFields(pkg: Partial<PackageJson>): Partial<PackageJson> {
    const fields = new Set(fieldOrder.filter((field) => field in pkg));
    const sorted = new Set(Object.keys(pkg).sort());
    return Object.fromEntries([...fields.union(sorted)].map((field) => [field, pkg[field]]));
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
