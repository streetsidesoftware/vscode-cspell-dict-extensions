#!/usr/bin/env node

/**
 * Fix extensions of files.
 */

import {
    fixExtensionPackageJson,
    getExtensionList,
    type PackageJson,
    readExtensionPackageJson,
    readPackageJson,
    writeExtensionPackageJson,
} from './lib/extensionHelper.mts';

async function run() {
    console.log('Fixing extensions...');
    const extensions = await getExtensionList();

    const rootPkg = await readPackageJson(new URL('../package.json', import.meta.url));

    const vscodeEngine = rootPkg.engines?.vscode || '^1.125.0';

    const overrides: Partial<PackageJson> = {
        engines: { vscode: vscodeEngine },
    };

    for (const ext of extensions) {
        const pkg = await readExtensionPackageJson(ext);
        await writeExtensionPackageJson(ext, fixExtensionPackageJson(ext, pkg, overrides));
    }
}

await run();
