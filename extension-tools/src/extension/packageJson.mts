/**
 * An extension's `package.json`: its fields, the only code that writes it, and the fields every extension shares.
 */

import path from 'node:path';

import type { IPackageOptions } from '@vscode/vsce';

import { readPackageJson, writeIfChanged } from '../helpers/index.mts';
import type { PackageJson } from '../helpers/index.mts';

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

/** The order of the fields in an extension's `package.json`. Fields that aren't listed go after these. */
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

/** An extension's `package.json`: the fields the tools read or write, and the rest as they are. */
export interface ExtensionPackageJson extends PackageJson {
    displayName: string;
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
}

/**
 * @param extensionDir - the extension's directory, as an absolute path or a repo path.
 */
export async function readExtensionPackageJson(extensionDir: string): Promise<ExtensionPackageJson> {
    return readPackageJson<ExtensionPackageJson>(extensionDir);
}

/**
 * Write an extension's `package.json`, with its fields in a fixed order.
 * @param extensionDir - the extension's directory, as an absolute path or a repo path.
 * @param pkg - a new extension's starter has only some of the fields; the sync fills in the rest.
 * @param options - `check` only reports whether the file would change.
 * @returns whether the file changed.
 */
export async function writeExtensionPackageJson(
    extensionDir: string,
    pkg: Partial<ExtensionPackageJson>,
    options: { check?: boolean | undefined } = {},
): Promise<boolean> {
    const file = path.join(extensionDir, 'package.json');
    const text = JSON.stringify(sortFields(pkg), null, 2) + '\n';
    return writeIfChanged(file, text, options.check);
}

/** The fields in the order of `fieldOrder`, then the unlisted ones in alphabetical order. */
function sortFields(pkg: Partial<ExtensionPackageJson>): Partial<ExtensionPackageJson> {
    const fields = new Set(fieldOrder.filter((field) => field in pkg));
    const sorted = new Set(Object.keys(pkg).sort());
    return Object.fromEntries([...fields.union(sorted)].map((field) => [field, pkg[field]]));
}

/**
 * The extension's `package.json` with the fields every extension shares.
 * @param repoPath - the extension's directory as a repo path, e.g. `extensions/swedish`.
 * @param vscodeEngine - the `engines.vscode` of the runtime.
 */
export function withSharedFields(
    repoPath: string,
    pkg: ExtensionPackageJson,
    vscodeEngine: string,
): ExtensionPackageJson {
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
