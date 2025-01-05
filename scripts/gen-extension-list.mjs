#!/usr/bin/env node

// @ts-check
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { toMarkdown } from 'mdast-util-to-markdown';

import { root, paragraph, text, heading, list, listItem, link } from './lib/mdastBuilder.mjs';

import { getExtensionInfo } from './lib/extensionHelper.mjs';

/**
 * @typedef {import('./lib/extensionHelper.mjs').ExtensionInfo} ExtensionInfo
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.dirname(__dirname);

const targetExtensionFolderListMarkdown = path.join(__root, 'static/generated/extension_list.md');
const targetMarketplaceLanguageExtensions = path.join(__root, 'static/generated/marketplace_language_extensions.md');
const targetMarketplaceExtensions = path.join(__root, 'static/generated/marketplace_extensions.md');

/**
 * @type {import('mdast-util-to-markdown').Options}
 */
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
            link(extensionInfo.extensionPath + '#readme', text(extensionInfo.displayNameShort)),
            text(` - ${extensionInfo.description}`),
        ]),
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
                text(extensionInfo.displayNameShort),
            ),
            text(' - ' + extensionInfo.description),
        ]),
    );
}


/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 */
async function generateExtensionFolderListMarkdown(extensionInfos) {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    /** @type {import('mdast').RootContent[]} */
    const mdastContent = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text(category)));
        mdastContent.push(list('unordered', extensions.map(makeExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetExtensionFolderListMarkdown);
}

/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 */
async function generateMarketplaceExtensionsListMarkdown(extensionInfos) {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    /** @type {import('mdast').RootContent[]} */
    const mdastContent = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text(category)));
        mdastContent.push(list('unordered', extensions.map(makeMarketplaceExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetMarketplaceExtensions);
}

/**
 *
 * @param {ExtensionInfo[]} extensionInfos
 */
async function generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos) {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    /** @type {import('mdast').RootContent[]} */
    const mdastContent = [];

    const headingTitle = {
        Languages: 'Language Dictionaries',
        'Technical Terms': 'Technical Dictionaries',
    };

    for (const [category, extensions] of extensionsByCategory) {
        const title = headingTitle[category];
        if (!title) continue;
        mdastContent.push(heading(3, text(title)));
        mdastContent.push(list('unordered', extensions.map(makeMarketplaceExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetMarketplaceLanguageExtensions);
}

/**
 *
 * @param {import('mdast').RootContent[]} mdastContent
 * @param {string} filename
 */
async function writeContentToFile(mdastContent, filename) {
    /** @type {import('mdast').Root} */
    const tree = root(mdastContent);
    const content = genMarkdown(tree);

    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, content, 'utf8');
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
    await generateMarketplaceExtensionsListMarkdown(extensionInfos);
    await generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos);
}

await main();
