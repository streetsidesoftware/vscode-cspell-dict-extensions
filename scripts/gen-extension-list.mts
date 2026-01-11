#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import * as path from 'path';
import { toMarkdown } from 'mdast-util-to-markdown';
import type { Root, RootContent, ListItem } from 'mdast';
import type { Options } from 'mdast-util-to-markdown';

import { root, paragraph, text, heading, list, listItem, link, newLineText } from './lib/mdastBuilder.mts';
import { getExtensionInfo } from './lib/extensionHelper.mts';
import type { ExtensionInfo } from './lib/extensionHelper.mts';
import type { CodeWorkspace } from './lib/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.dirname(__dirname);

const targetExtensionFolderListMarkdown = path.join(__root, 'static/generated/extension_list.md');
const targetMarketplaceLanguageExtensions = path.join(__root, 'static/generated/marketplace_language_extensions.md');
const targetMarketplaceExtensions = path.join(__root, 'static/generated/marketplace_extensions.md');

const markdownOptions: Options = {
    bullet: '-',
};

function makeExtensionListItem(extensionInfo: ExtensionInfo): ListItem {
    return listItem(
        paragraph([
            link(extensionInfo.extensionPath + '#readme', text(extensionInfo.displayNameShort)),
            text(` - ${extensionInfo.description}`),
        ]),
    );
}

function makeMarketplaceExtensionListItem(extensionInfo: ExtensionInfo): ListItem {
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

async function generateExtensionFolderListMarkdown(extensionInfos: ExtensionInfo[]): Promise<void> {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    const mdastContent: RootContent[] = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text(category)));
        mdastContent.push(newLineText());
        mdastContent.push(list('unordered', extensions.map(makeExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetExtensionFolderListMarkdown);
}

async function generateMarketplaceExtensionsListMarkdown(extensionInfos: ExtensionInfo[]): Promise<void> {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    const mdastContent: RootContent[] = [];

    for (const [category, extensions] of extensionsByCategory) {
        mdastContent.push(heading(3, text(category)));
        mdastContent.push(newLineText());
        mdastContent.push(list('unordered', extensions.map(makeMarketplaceExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetMarketplaceExtensions);
}

async function generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos: ExtensionInfo[]): Promise<void> {
    const extensionsByCategory = groupExtensionsByType(extensionInfos);

    const mdastContent: RootContent[] = [];

    const headingTitle: Record<string, string | undefined> = {
        Languages: 'Language Dictionaries',
        'Technical Terms': 'Technical Dictionaries',
    };

    for (const [category, extensions] of extensionsByCategory) {
        const title = headingTitle[category];
        if (!title) continue;
        mdastContent.push(heading(3, text(title)));
        mdastContent.push(newLineText());
        mdastContent.push(list('unordered', extensions.map(makeMarketplaceExtensionListItem)));
    }

    await writeContentToFile(mdastContent, targetMarketplaceLanguageExtensions);
}

async function writeContentToFile(mdastContent: RootContent[], filename: string): Promise<void> {
    const tree: Root = root(mdastContent);
    const content = genMarkdown(tree);

    await fs.mkdir(path.dirname(filename), { recursive: true });
    await fs.writeFile(filename, content, 'utf8');
}

function genMarkdown(tree: Root): string {
    return toMarkdown(tree, markdownOptions)
        .replaceAll('\r\n', '\n')
        .replace(/\n\n( *)[-]\s+/g, '\n$1- ')
        .replace(/\n\n\n+/g, '\n\n');
}

function groupExtensionsByType(extensionInfos: ExtensionInfo[]): Map<string, ExtensionInfo[]> {
    const extensionsByCategory = new Map<string, ExtensionInfo[]>();

    for (const ext of extensionInfos) {
        const cat = extensionsByCategory.get(ext.dictionaryType) || [];
        cat.push(ext);
        extensionsByCategory.set(ext.dictionaryType, cat);
    }

    return extensionsByCategory;
}

async function main(): Promise<void> {
    const workspace: CodeWorkspace = JSON.parse(
        await fs.readFile(path.resolve(__root, 'dict-extensions.code-workspace'), 'utf-8'),
    );

    const allFolders: string[] = workspace.folders.map((f) => f.path);

    const extensions = allFolders.filter((f) => f.startsWith('extension'));
    const extensionInfos = await Promise.all(extensions.map(getExtensionInfo));

    await generateExtensionFolderListMarkdown(extensionInfos);
    await generateMarketplaceExtensionsListMarkdown(extensionInfos);
    await generateMarketplaceLanguageExtensionsListMarkdown(extensionInfos);
}

await main();
