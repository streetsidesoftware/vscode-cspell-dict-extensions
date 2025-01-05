#!/usr/bin/env node

/**
 * Fix extensions of files.
 */

// @ts-check

import {
    fixExtensionPackageJson,
    getExtensionList,
    readExtensionPackageJson,
    writeExtensionPackageJson,
} from './lib/extensionHelper.mjs';

async function run() {
    console.log('Fixing extensions...');
    const extensions = await getExtensionList();

    for (const ext of extensions) {
        const pkg = await readExtensionPackageJson(ext);
        fixExtensionPackageJson(ext, pkg);
        await writeExtensionPackageJson(ext, pkg);
    }
}

await run();
