import fs from 'node:fs/promises';
import pathPosix from 'node:path/posix';
import { sortPackageJson } from 'sort-package-json';
import type { IPackageOptions } from '@vscode/vsce';

const rootUrl = new URL('../../', import.meta.url);
const extensionsUrl = new URL('extensions/', rootUrl);

const repositoryUrl = new URL('https://github.com/streetsidesoftware/vscode-cspell-dict-extensions');
const repositoryRawUrl = new URL(
    'https://raw.githubusercontent.com/streetsidesoftware/vscode-cspell-dict-extensions/refs/heads/main/',
);

export interface Repository {
    type: 'git';
    url: string;
    directory?: string;
}

const defaultRepository: Repository = {
    type: 'git',
    url: repositoryUrl.href,
};

export async function getExtensionList(): Promise<string[]> {
    const extensionFolders = await fs.readdir(extensionsUrl, { withFileTypes: true });
    return extensionFolders
        .filter((f) => f.isDirectory())
        .map((f) => new URL(f.name + '/', extensionsUrl))
        .map((u) => urlRelativeToRoot(u));
}

/**
 * return a relative path to the repository root.
 */
export function urlRelativeToRoot(url: URL): string {
    const addSlash = url.pathname.endsWith('/') ? '/' : '';
    return pathPosix.relative(rootUrl.pathname, url.pathname) + addSlash;
}

export interface ExtensionInfo {
    name: string;
    displayName: string;
    displayNameShort: string;
    version: string;
    description: string;
    extensionPath: string;
    dictionaryType: string;
}

export async function getExtensionInfo(extensionPath: string): Promise<ExtensionInfo> {
    const pkgUrl = new URL(pathPosix.join(extensionPath, 'package.json'), rootUrl);
    const pkg = JSON.parse(await fs.readFile(pkgUrl, 'utf8'));

    const info: ExtensionInfo = {
        name: pkg.name,
        description: pkg.description,
        displayName: pkg.displayName,
        displayNameShort: pkg.displayName.replace(/ -.*/, '').trim(),
        version: pkg.version,
        extensionPath,
        dictionaryType: lookUpDictionaryType(extensionPath),
    };
    return info;
}

interface DictionaryTypesConfig {
    types: Record<string, string[]>;
    default: string;
}

const dictionaryTypes: DictionaryTypesConfig = JSON.parse(
    await fs.readFile(new URL('static/dictionary-types.json', rootUrl), 'utf8'),
);

function lookUpDictionaryType(extensionPath: string): string {
    for (const [category, extensions] of Object.entries(dictionaryTypes.types)) {
        if (extensions.includes(extensionPath)) return category;
    }

    return dictionaryTypes.default;
}

type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type VSCEPackageOptions = Writable<IPackageOptions>;

export interface PackageJson {
    name: string;
    displayName: string;
    version: string;
    description: string;
    main: string;
    browser?: string;
    repository?: Repository;
    publisher?: string;
    author?: string;
    contributors?: string[];
    vsce?: VSCEPackageOptions;
    private: boolean;
    preview?: boolean | undefined;
    bugs?: { url: string };
    engines?: { [engine: string]: string };
}

export async function readPackageJson(pkgUrl: URL | string): Promise<PackageJson> {
    return JSON.parse(await fs.readFile(pkgUrl, 'utf8'));
}

export async function readExtensionPackageJson(extensionPath: string | URL): Promise<PackageJson> {
    const extUrl = new URL(extensionPath, rootUrl);
    const pkgUrl = new URL('package.json', extUrl);
    return readPackageJson(pkgUrl);
}

export async function writeExtensionPackageJson(extensionPath: string | URL, pkg: PackageJson): Promise<void> {
    const extUrl = new URL(extensionPath, rootUrl);
    const pkgUrl = new URL('package.json', extUrl);
    await fs.writeFile(pkgUrl, JSON.stringify(pkg, null, 2) + '\n');
}

export function fixExtensionPackageJson(
    extensionDir: string | URL,
    pkg: PackageJson,
    overrides: Partial<PackageJson>,
): PackageJson {
    Object.assign(pkg, overrides);

    const extensionDirStr = urlRelativeToRoot(new URL(extensionDir, rootUrl));
    pkg.private = true;
    pkg.preview = undefined;
    pkg.repository = pkg.repository || { ...defaultRepository };
    pkg.repository.directory = extensionDirStr.replace(/\/$/, '');
    pkg.publisher = 'streetsidesoftware';
    pkg.author = 'Street Side Software <support@streetsidesoftware.nl>';
    pkg.contributors = pkg.contributors || [];
    pkg.vsce = pkg.vsce || {};
    pkg.vsce.baseContentUrl = new URL(extensionDirStr, repositoryRawUrl).href;
    pkg.vsce.baseImagesUrl = new URL(extensionDirStr, repositoryRawUrl).href;
    pkg.bugs = {
        url: 'https://github.com/streetsidesoftware/vscode-cspell-dict-extensions/issues',
    };

    return sortPackageJson(pkg);
}
