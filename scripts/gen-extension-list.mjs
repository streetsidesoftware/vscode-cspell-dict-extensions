#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { toMarkdown } from 'mdast-util-to-markdown';
import { root, paragraph, text, heading, list, listItem, link } from 'mdast-builder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.dirname(__dirname);

const targetExtensionFolderListMarkdown = path.join(__root, 'static/generated/extension_list.md');
const targetMarketplaceLanguageExtensions = path.join(__root, 'static/generated/marketplace_language_extensions.md');

const markdownOptions = {
    bullet: '-',
};

/**
 *
 * @param {string} url
 * @returns {import('mdast').Link}
 */
function pathToLink(url, name) {
    /** @type {import('mdast').Link} */
    const link = {
        type: 'link',
        url: url,
        children: [{ type: 'text', value: name }],
    };

    return link;
}

/**
 *
 * @param {ExtensionInfo} extensionInfo
 * @returns {import('mdast').ListItem}
 */
function makeExtensionListItem(extensionInfo) {
    return listItem(
        paragraph([
            link(extensionInfo.extensionPath + '#readme', undefined, text(extensionInfo.displayNameShort)),
            text(` - ${extensionInfo.version} - ${extensionInfo.description}`),
        ])
    );
}

/**
 *
 * @param {ExtensionInfo} extensionInfo
 * @returns {import('mdast').ListItem}
 */
function makeMarketplaceExtensionListItem(extensionInfo) {
    return listItem(
        paragraph([
            link(
                'https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.' + extensionInfo.name,
                undefined,
                text(extensionInfo.displayNameShort)
            ),
            text(' - ' + extensionInfo.description),
        ])
    );
}

/**
 *
 * @typedef {Object} ExtensionInfo
 * @property {string} name
 * @property {string} displayName
 * @property {string} displayNameShort
 * @property {string} version
 * @property {string} description
 * @property {string} extensionPath
 * @property {string} dictionaryType
 */

/** @type {import('../static/dictionary-types.json')} */
const dictionaryTypes = JSON.parse(await fs.readFile(path.join(__root, 'static/dictionary-types.json')));

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
 *
 * @param {string} extensionPath
 * @returns {Promise<ExtensionInfo>}
 */
async function getExtensionInfo(extensionPath) {
    const pkg = JSON.parse(await fs.readFile(path.join(__root, extensionPath, 'package.json'), 'utf8'));

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

/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 */
async function generateExtensionFolderListMarkdown(extensionInfos) {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    /** @type {import('mdast').Content} */
    const mdastContent = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text(category)));
        mdastContent.push(list('unordered', extensions.map(makeExtensionListItem)));
    }

    /** @type {import('mdast').Root} */
    const tree = root(mdastContent);
    const content = genMarkdown(tree);

    await fs.mkdir(path.dirname(targetExtensionFolderListMarkdown), { recursive: true });

    await fs.writeFile(targetExtensionFolderListMarkdown, content, 'utf8');
}

/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 */
async function generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos) {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    /** @type {import('mdast').Content} */
    const mdastContent = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text('VS Code Marketplace Extensions: ' + category)));
        mdastContent.push(list('unordered', extensions.map(makeMarketplaceExtensionListItem)));
    }

    /** @type {import('mdast').Root} */
    const tree = root(mdastContent);
    const content = genMarkdown(tree);

    await fs.mkdir(path.dirname(targetExtensionFolderListMarkdown), { recursive: true });

    await fs.writeFile(targetMarketplaceLanguageExtensions, content, 'utf8');
}

/**
 *
 * @param {import('mdast').Root} tree
 * @returns {string}
 */
function genMarkdown(tree) {
    return toMarkdown(tree, markdownOptions).replace(/\r?\n\r?\n( *)[-]\s+/g, '\n$1- ');
}

/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 * @returns {Map<string, ExtensionInfo[]>}
 */
function groupExtensionsByType(extensionInfos) {
    /**
     * @type {Map<string, ExtensionInfo[]>}
     */
    const extensionsByCategory = new Map();

    for (const ext of extensionInfos) {
        const cat = extensionsByCategory.get(ext.dictionaryType) || [];
        cat.push(ext);
        extensionsByCategory.set(ext.dictionaryType, cat);
    }

    return extensionsByCategory;
}

async function main() {
    const workspace = JSON.parse(await fs.readFile(path.resolve(__root, 'dict-extensions.code-workspace'), 'utf-8'));

    /** @type {string[]} */
    const allFolders = workspace.folders.map((f) => f.path);

    const extensions = allFolders.filter((f) => f.startsWith('extension'));
    const extensionInfos = await Promise.all(extensions.map(getExtensionInfo));

    await generateExtensionFolderListMarkdown(extensionInfos);
    await generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos);
}

await main();
