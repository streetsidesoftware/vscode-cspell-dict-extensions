#!/usr/bin/env node

/**
 * Fix extensions of files.
 */

import {
    fixExtensionPackageJson,
    type PackageJson,
    readExtensionPackageJson,
    writeExtensionPackageJson,
} from './lib/extensionHelper.mts';
import { listExtensionDirs, readVscodeEngine } from './lib/repo.mts';

async function run() {
    console.log('Fixing extensions...');
    // The helpers take the directory as a URL path, with a trailing slash.
    const extensions = (await listExtensionDirs()).map((dir) => dir + '/');

    const overrides: Partial<PackageJson> = {
        engines: { vscode: await readVscodeEngine() },
    };

    for (const ext of extensions) {
        const pkg = await readExtensionPackageJson(ext);
        await writeExtensionPackageJson(ext, fixExtensionPackageJson(ext, pkg, overrides));
    }
}

await run();
