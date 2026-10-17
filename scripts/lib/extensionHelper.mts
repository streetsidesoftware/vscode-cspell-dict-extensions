import fs from 'node:fs/promises';
import path from 'node:path';

import type { IPackageOptions } from '@vscode/vsce';
import { sortPackageJson } from 'sort-package-json';

import { readJson, repoRoot } from './repo.mts';

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

export interface ExtensionInfo {
    name: string;
    displayName: string;
    displayNameShort: string;
    version: string;
    description: string;
    extensionPath: string;
    dictionaryType: string;
    /** `vsce.preRelease` in the extension's package.json */
    preRelease: boolean;
}

export async function getExtensionInfo(extensionPath: string): Promise<ExtensionInfo> {
    const pkg = await readExtensionPackageJson(extensionPath);

    const info: ExtensionInfo = {
        name: pkg.name,
        description: pkg.description,
        displayName: pkg.displayName,
        displayNameShort: pkg.displayName.replace(/ -.*/, '').trim(),
        version: pkg.version,
        extensionPath,
        dictionaryType: await lookUpDictionaryType(extensionPath),
        preRelease: pkg.vsce?.preRelease === true,
    };
    return info;
}

interface DictionaryTypesConfig {
    types: Record<string, string[]>;
    default: string;
}

let dictionaryTypes: Promise<DictionaryTypesConfig> | undefined;

async function lookUpDictionaryType(extensionPath: string): Promise<string> {
    const { types, default: defaultType } = await (dictionaryTypes ??= readJson('static/dictionary-types.json'));
    for (const [category, extensions] of Object.entries(types)) {
        if (extensions.includes(extensionPath)) return category;
    }

    return defaultType;
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

export async function readExtensionPackageJson(extensionPath: string): Promise<PackageJson> {
    return readJson(`${extensionPath}/package.json`);
}

export async function writeExtensionPackageJson(extensionPath: string, pkg: PackageJson): Promise<void> {
    await fs.writeFile(path.join(repoRoot, extensionPath, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * The extension's `package.json` with the fields every extension shares, sorted.
 */
export function fixExtensionPackageJson(
    extensionPath: string,
    pkg: PackageJson,
    overrides: Partial<PackageJson>,
): PackageJson {
    const baseUrl = new URL(`${extensionPath}/`, repositoryRawUrl).href;
    return sortPackageJson({
        ...pkg,
        ...overrides,
        private: true,
        preview: undefined,
        repository: { ...(pkg.repository ?? defaultRepository), directory: extensionPath },
        publisher: 'streetsidesoftware',
        author: 'Street Side Software <support@streetsidesoftware.nl>',
        contributors: pkg.contributors ?? [],
        vsce: { ...pkg.vsce, baseContentUrl: baseUrl, baseImagesUrl: baseUrl },
        bugs: {
            url: 'https://github.com/streetsidesoftware/vscode-cspell-dict-extensions/issues',
        },
    });
}
