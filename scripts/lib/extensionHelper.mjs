// @ts-check
import fs from 'node:fs/promises';
import pathPosix from 'node:path/posix';

const rootUrl = new URL('../../', import.meta.url);
const extensionsUrl = new URL('extensions/', rootUrl);

const repositoryUrl = new URL('https://github.com/streetsidesoftware/vscode-cspell-dict-extensions');
const repositoryRawUrl = new URL(
    'https://raw.githubusercontent.com/streetsidesoftware/vscode-cspell-dict-extensions/refs/heads/main/',
);

/** @type {Repository} */
const defaultRepository = {
    type: 'git',
    url: repositoryUrl.href,
};

/**
 * @returns {Promise<string[]>}
 */
export async function getExtensionList() {
    const extensionFolders = await fs.readdir(extensionsUrl, { withFileTypes: true });
    return extensionFolders
        .filter((f) => f.isDirectory())
        .map((f) => new URL(f.name + '/', extensionsUrl))
        .map((u) => urlRelativeToRoot(u));
}

/**
 * return a relative path to the repository root.
 * @param {URL} url
 * @returns {string}
 */
export function urlRelativeToRoot(url) {
    const addSlash = url.pathname.endsWith('/') ? '/' : '';
    return pathPosix.relative(rootUrl.pathname, url.pathname) + addSlash;
}

/**
 * @typedef {Object} ExtensionInfo
 * @property {string} name
 * @property {string} displayName
 * @property {string} displayNameShort
 * @property {string} version
 * @property {string} description
 * @property {string} extensionPath
 * @property {string} dictionaryType
 */

/**
 *
 * @param {string} extensionPath
 * @returns {Promise<ExtensionInfo>}
 */
export async function getExtensionInfo(extensionPath) {
    const pkgUrl = new URL(pathPosix.join(extensionPath, 'package.json'), rootUrl);
    const pkg = JSON.parse(await fs.readFile(pkgUrl, 'utf8'));

    /** @type {ExtensionInfo} */
    const info = {
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

/** @type {import('../../static/dictionary-types.json')} */
const dictionaryTypes = JSON.parse(await fs.readFile(new URL('static/dictionary-types.json', rootUrl), 'utf8'));

/**
 *
 * @param {string} extensionPath
 * @returns {string}
 */
function lookUpDictionaryType(extensionPath) {
    for (const [category, extensions] of Object.entries(dictionaryTypes.types)) {
        if (extensions.includes(extensionPath)) return category;
    }

    return dictionaryTypes.default;
}

/**
 * @template T
 * @typedef {{ -readonly [P in keyof T]: T[P] }} Writable
 */

/**
 * @typedef {Writable<import('@vscode/vsce').IPackageOptions>} VSCEPackageOptions
 */

/**
 * @typedef {Object} Repository
 * @property {'git'} type
 * @property {string} url
 * @property {string} [directory]
 */

/**
 * @typedef {Object} PackageJson
 * @property {string} name
 * @property {string} displayName
 * @property {string} version
 * @property {string} description
 * @property {string} main
 * @property {string} [browser]
 * @property {Repository} [repository]
 * @property {string} [publisher]
 * @property {string} [author]
 * @property {string[]} [contributors]
 * @property {VSCEPackageOptions} [vsce]
 * @property {boolean} private
 * @property {boolean | undefined} [preview]
 * @property {{ url: string }} [bugs]
 */

/**
 *
 * @param {URL | string} pkgUrl
 * @returns {Promise<PackageJson>}
 */
export async function readPackageJson(pkgUrl) {
    return JSON.parse(await fs.readFile(pkgUrl, 'utf8'));
}

/**
 *
 * @param {string | URL} extensionPath
 * @returns {Promise<PackageJson>}
 */
export async function readExtensionPackageJson(extensionPath) {
    const extUrl = new URL(extensionPath, rootUrl);
    const pkgUrl = new URL('package.json', extUrl);
    return readPackageJson(pkgUrl);
}

/**
 *
 * @param {string | URL} extensionPath
 * @param {PackageJson} pkg
 */
export async function writeExtensionPackageJson(extensionPath, pkg) {
    const extUrl = new URL(extensionPath, rootUrl);
    const pkgUrl = new URL('package.json', extUrl);
    await fs.writeFile(pkgUrl, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * @param {string | URL} extensionDir
 * @param {PackageJson} pkg
 * @returns {PackageJson}
 */
export function fixExtensionPackageJson(extensionDir, pkg) {
    extensionDir = urlRelativeToRoot(new URL(extensionDir, rootUrl));
    pkg.private = true;
    pkg.preview = undefined;
    pkg.repository = pkg.repository || { ...defaultRepository };
    pkg.repository.directory = extensionDir.replace(/\/$/, '');
    pkg.publisher = 'streetsidesoftware';
    pkg.author = 'Street Side Software <support@streetsidesoftware.nl>';
    pkg.contributors = pkg.contributors || [];
    pkg.vsce = pkg.vsce || {};
    pkg.vsce.baseContentUrl = new URL(extensionDir, repositoryRawUrl).href;
    pkg.vsce.baseImagesUrl = new URL(extensionDir, repositoryRawUrl).href;
    pkg.bugs = {
        url: 'https://github.com/streetsidesoftware/vscode-cspell-dict-extensions/issues',
    };
    return pkg;
}
