#!/usr/bin/env node

/**
 * Generate the extension lists in `static/generated/`, which READMEs inject. Each list groups the extensions under a
 * heading per category, from the extension's `kind`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { getExtensionInfo, listExtensionRepoPaths } from '../extension-tools/api.mts';
import type { ExtensionInfo, ExtensionKind } from '../extension-tools/api.mts';

import { document, heading, link, list, listItem, strong } from 'inject-markdown/markdown';
import type { InlineContent, MDBlock, MDListItem } from 'inject-markdown/markdown';
import { repoRoot } from './lib/repo.mts';

const generatedDir = path.join(repoRoot, 'static/generated');

/** The category of each kind of extension. */
const categoryOfKind: Record<ExtensionKind, string> = {
    language: 'Languages',
    wordList: 'Technical Terms',
    bundle: 'Support',
    parser: 'Parsers',
};

/** The category of an extension without an `extension.config.json`. */
const defaultCategory = 'Other';

/** The headings of the categories in `marketplace_language_extensions.md`; the other categories are left out. */
const languageListHeadings: Record<string, string | undefined> = {
    Languages: 'Language Dictionaries',
    'Technical Terms': 'Technical Dictionaries',
};

function preReleaseMarker(extensionInfo: ExtensionInfo): InlineContent {
    return extensionInfo.preRelease ? [' ', strong('pre-release')] : [];
}

function extensionListItem(url: string, extensionInfo: ExtensionInfo): MDListItem {
    return listItem(
        link(extensionInfo.displayNameShort, url),
        preReleaseMarker(extensionInfo),
        ` - ${extensionInfo.description}`,
    );
}

function folderListItem(extensionInfo: ExtensionInfo): MDListItem {
    // Relative to `static/generated/`; inject-markdown rebases the link when injecting.
    return extensionListItem(`../../${extensionInfo.repoPath}#readme`, extensionInfo);
}

function marketplaceListItem(extensionInfo: ExtensionInfo): MDListItem {
    const url = `https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.${extensionInfo.packageName}`;
    return extensionListItem(url, extensionInfo);
}

/**
 * Write a list of the extensions, under a heading per category.
 * @param headingOf - the heading of a category, or `undefined` to leave the category out.
 */
async function writeExtensionList(
    file: string,
    extensionsByCategory: Map<string, ExtensionInfo[]>,
    makeItem: (extensionInfo: ExtensionInfo) => MDListItem,
    headingOf: (category: string) => string | undefined = (category) => category,
): Promise<void> {
    const content: MDBlock[] = [];
    for (const [category, extensions] of extensionsByCategory) {
        const title = headingOf(category);
        if (!title) continue;
        content.push(heading(3, title), list(extensions.map(makeItem)));
    }

    await fs.mkdir(generatedDir, { recursive: true });
    await fs.writeFile(path.join(generatedDir, file), document(content).toString(), 'utf8');
}

/** The categories in the order their first extension appears. */
function groupExtensionsByType(extensionInfos: ExtensionInfo[]): Map<string, ExtensionInfo[]> {
    const extensionsByCategory = new Map<string, ExtensionInfo[]>();

    for (const extensionInfo of extensionInfos) {
        const category = extensionInfo.kind ? categoryOfKind[extensionInfo.kind] : defaultCategory;
        const cat = extensionsByCategory.get(category) || [];
        cat.push(extensionInfo);
        extensionsByCategory.set(category, cat);
    }

    return extensionsByCategory;
}

export async function genExtensionList(): Promise<void> {
    const extensionInfos = await Promise.all((await listExtensionRepoPaths()).map(getExtensionInfo));
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
