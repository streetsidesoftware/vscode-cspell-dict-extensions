/**
 * An extension's `package.json`: the only code that reads or writes the file.
 */

import path from 'node:path';

import type { IPackageOptions } from '@vscode/vsce';

import { readJson, writeIfChanged } from '../helpers/index.mts';

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
    devDependencies?: { [name: string]: string };
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
 * Write an extension's `package.json`, with the fields in the order given.
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
    return writeIfChanged(path.join(extensionDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', options.check);
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
