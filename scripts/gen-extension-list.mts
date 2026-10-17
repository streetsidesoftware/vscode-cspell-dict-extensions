#!/usr/bin/env node

/**
 * Generate the extension lists in `static/generated/`, which READMEs inject.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { ListItem, PhrasingContent, RootContent } from 'mdast';
import { toMarkdown } from 'mdast-util-to-markdown';

import { type ExtensionInfo, getExtensionInfo } from './lib/extensionHelper.mts';
import { heading, link, list, listItem, paragraph, root, strong, text } from './lib/mdastBuilder.mts';
import { listExtensionDirs, repoRoot } from './lib/repo.mts';

const generatedDir = path.join(repoRoot, 'static/generated');

/** The headings of the categories in `marketplace_language_extensions.md`; the other categories are left out. */
const languageListHeadings: Record<string, string | undefined> = {
    Languages: 'Language Dictionaries',
    'Technical Terms': 'Technical Dictionaries',
};

function preReleaseMarker(extensionInfo: ExtensionInfo): PhrasingContent[] {
    return extensionInfo.preRelease ? [text(' '), strong(text('pre-release'))] : [];
}

function extensionListItem(url: string, extensionInfo: ExtensionInfo): ListItem {
    return listItem(
        paragraph([
            link(url, text(extensionInfo.displayNameShort)),
            ...preReleaseMarker(extensionInfo),
            text(` - ${extensionInfo.description}`),
        ]),
    );
}

/** An item that links to the extension's folder. */
function folderListItem(extensionInfo: ExtensionInfo): ListItem {
    // Relative to `static/generated/`; inject-markdown rebases the link when injecting.
    return extensionListItem(`../../${extensionInfo.extensionPath}#readme`, extensionInfo);
}

/** An item that links to the extension in the Marketplace. */
function marketplaceListItem(extensionInfo: ExtensionInfo): ListItem {
    const url = `https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.${extensionInfo.name}`;
    return extensionListItem(url, extensionInfo);
}

/**
 * Write a list of the extensions, under a heading per category.
 * @param file - the file name in `static/generated/`.
 * @param makeItem - makes the list item of an extension.
 * @param headingOf - the heading of a category, or `undefined` to leave the category out.
 */
async function writeExtensionList(
    file: string,
    extensionsByCategory: Map<string, ExtensionInfo[]>,
    makeItem: (extensionInfo: ExtensionInfo) => ListItem,
    headingOf: (category: string) => string | undefined = (category) => category,
): Promise<void> {
    const content: RootContent[] = [];
    for (const [category, extensions] of extensionsByCategory) {
        const title = headingOf(category);
        if (!title) continue;
        content.push(heading(3, text(title)), list('unordered', extensions.map(makeItem)));
    }

    await fs.mkdir(generatedDir, { recursive: true });
    await fs.writeFile(path.join(generatedDir, file), toMarkdown(root(content), { bullet: '-' }), 'utf8');
}

/** The categories in the order their first extension appears. */
function groupExtensionsByType(extensionInfos: ExtensionInfo[]): Map<string, ExtensionInfo[]> {
    const extensionsByCategory = new Map<string, ExtensionInfo[]>();

    for (const ext of extensionInfos) {
        const cat = extensionsByCategory.get(ext.dictionaryType) || [];
        cat.push(ext);
        extensionsByCategory.set(ext.dictionaryType, cat);
    }

    return extensionsByCategory;
}

export async function genExtensionList(): Promise<void> {
    const extensionInfos = await Promise.all((await listExtensionDirs()).map(getExtensionInfo));
    const byCategory = groupExtensionsByType(extensionInfos);

    await writeExtensionList('extension_list.md', byCategory, folderListItem);
    await writeExtensionList('marketplace_extensions.md', byCategory, marketplaceListItem);
    await writeExtensionList(
        'marketplace_language_extensions.md',
        byCategory,
        marketplaceListItem,
        (category) => languageListHeadings[category],
    );
}

if (import.meta.main) await genExtensionList();
