import fs from 'node:fs/promises';
import path from 'node:path';

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
    packageName: string;
    displayName: string;
    displayNameShort: string;
    version: string;
    description: string;
    /** The extension's directory as a repo path, e.g. `extensions/swedish`. */
    repoPath: string;
    dictionaryType: string;
    /** `vsce.preRelease` in the extension's package.json */
    preRelease: boolean;
}

export async function getExtensionInfo(repoPath: string): Promise<ExtensionInfo> {
    const pkg = await readExtensionPackageJson(repoPath);

    const info: ExtensionInfo = {
        packageName: pkg.name,
        description: pkg.description,
        displayName: pkg.displayName,
        displayNameShort: pkg.displayName.replace(/ -.*/, '').trim(),
        version: pkg.version,
        repoPath,
        dictionaryType: await lookUpDictionaryType(repoPath),
        preRelease: pkg.vsce?.preRelease === true,
    };
    return info;
}

interface DictionaryTypesConfig {
    types: Record<string, string[]>;
    default: string;
}

let dictionaryTypes: Promise<DictionaryTypesConfig> | undefined;

async function lookUpDictionaryType(repoPath: string): Promise<string> {
    const { types, default: defaultType } = await (dictionaryTypes ??= readJson('static/dictionary-types.json'));
    for (const [category, extensions] of Object.entries(types)) {
        if (extensions.includes(repoPath)) return category;
    }

    return defaultType;
}

/** The `vsce` options the scripts set or read; the others are kept as they are. */
export interface VsceOptions {
    baseContentUrl?: string;
    baseImagesUrl?: string;
    preRelease?: boolean;
    [option: string]: unknown;
}

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
    vsce?: VsceOptions;
    private: boolean;
    preview?: boolean | undefined;
    bugs?: { url: string };
    engines?: { [engine: string]: string };
}

export async function readExtensionPackageJson(repoPath: string): Promise<PackageJson> {
    return readJson(`${repoPath}/package.json`);
}

export async function writeExtensionPackageJson(repoPath: string, pkg: PackageJson): Promise<void> {
    await fs.writeFile(path.join(repoRoot, repoPath, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * The extension's `package.json` with the fields every extension shares.
 */
export function fixExtensionPackageJson(
    repoPath: string,
    pkg: PackageJson,
    overrides: Partial<PackageJson>,
): PackageJson {
    const baseUrl = new URL(`${repoPath}/`, repositoryRawUrl).href;
    return {
        ...pkg,
        ...overrides,
        private: true,
        preview: undefined,
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
