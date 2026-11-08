/**
 * An extension's `package.json`: the only code that reads or writes the file.
 */

import path from 'node:path';

import type { IPackageOptions } from '@vscode/vsce';

import { extensionRepoPath, readJson, writeIfChanged } from '../helpers/index.mts';

const repositoryUrl = new URL('https://github.com/streetsidesoftware/vscode-cspell-dict-extensions');
const repositoryRawUrl = new URL(
    'https://raw.githubusercontent.com/streetsidesoftware/vscode-cspell-dict-extensions/refs/heads/main/',
);

interface Repository {
    type: 'git';
    url: string;
    directory?: string;
}

const defaultRepository: Repository = {
    type: 'git',
    url: repositoryUrl.href,
};

/** The order of the fields in an extension's `package.json`: the order `sort-package-json` gives them. */
const fieldOrder = [
    'name',
    'displayName',
    'version',
    'private',
    'description',
    'categories',
    'keywords',
    'bugs',
    'repository',
    'license',
    'qna',
    'author',
    'contributors',
    'publisher',
    'type',
    'main',
    'browser',
    'files',
    'scripts',
    'contributes',
    'activationEvents',
    'dependencies',
    'extensionDependencies',
    'engines',
    'icon',
    'capabilities',
    'extensionKind',
    'sponsor',
    'vsce',
];

export interface PackageJson {
    name: string;
    displayName: string;
    version: string;
    description: string;
    main: string;
    browser?: string;
    icon?: string;
    repository?: Repository;
    publisher?: string;
    author?: string;
    contributors?: string[];
    /** A type only: Node erases `import type`, so the scripts that run before `npm ci` don't need vsce installed. */
    vsce?: IPackageOptions;
    private: boolean;
    bugs?: { url: string };
    engines?: { [engine: string]: string };
    /** The fields the tools don't read, which they keep as they are. */
    [field: string]: unknown;
}

/**
 * @param extensionDir - the extension's directory, as an absolute path or a repo path.
 */
export async function readPackageJson(extensionDir: string): Promise<PackageJson> {
    return readJson(path.join(extensionDir, 'package.json'));
}

/**
 * Write an extension's `package.json`, with its fields in a fixed order.
 * @param extensionDir - the extension's directory, as an absolute path or a repo path.
 * @param pkg - a new extension's starter has only some of the fields; the sync fills in the rest.
 * @param options - `check` only reports whether the file would change.
 * @returns whether the file changed.
 */
export async function writePackageJson(
    extensionDir: string,
    pkg: Partial<PackageJson>,
    options: { check?: boolean | undefined } = {},
): Promise<boolean> {
    const file = path.join(extensionDir, 'package.json');
    const text = JSON.stringify(sortFields(pkg, `${extensionRepoPath(extensionDir)}/package.json`), null, 2) + '\n';
    return writeIfChanged(file, text, options.check);
}

/** The fields in the order of `fieldOrder`. */
function sortFields(pkg: Partial<PackageJson>, repoFile: string): Partial<PackageJson> {
    const unknown = Object.keys(pkg).filter((field) => !fieldOrder.includes(field));
    if (unknown.length) {
        throw new Error(
            `${repoFile}: ${unknown.map((field) => `"${field}"`).join(', ')} has no place in the field order. Add it to \`fieldOrder\` in extension-tools/src/extension/packageJson.mts.`,
        );
    }
    return Object.fromEntries(fieldOrder.filter((field) => field in pkg).map((field) => [field, pkg[field]]));
}

/**
 * The extension's `package.json` with the fields every extension shares.
 * @param repoPath - the extension's directory as a repo path, e.g. `extensions/swedish`.
 * @param vscodeEngine - the `engines.vscode` of the runtime.
 */
export function withSharedFields(repoPath: string, pkg: PackageJson, vscodeEngine: string): PackageJson {
    const baseUrl = new URL(`${repoPath}/`, repositoryRawUrl).href;
    return {
        ...pkg,
        engines: { ...pkg.engines, vscode: vscodeEngine },
        private: true,
        repository: { ...(pkg.repository ?? defaultRepository), directory: repoPath },
        publisher: 'streetsidesoftware',
        author: 'Street Side Software <support@streetsidesoftware.nl>',
        contributors: pkg.contributors ?? [],
        vsce: { ...pkg.vsce, baseContentUrl: baseUrl, baseImagesUrl: baseUrl },
        bugs: {
            url: 'https://github.com/streetsidesoftware/vscode-cspell-dict-extensions/issues',
        },
    };
}
