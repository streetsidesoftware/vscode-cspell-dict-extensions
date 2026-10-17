#!/usr/bin/env node

/**
 * Give every extension's `package.json` the fields the extensions share, and sort it.
 */

import {
    fixExtensionPackageJson,
    readExtensionPackageJson,
    writeExtensionPackageJson,
} from './lib/extensionHelper.mts';
import { listExtensionDirs, readVscodeEngine } from './lib/repo.mts';

export async function fixExtensions(): Promise<void> {
    console.log('Fixing extensions...');
    const overrides = { engines: { vscode: await readVscodeEngine() } };

    for (const ext of await listExtensionDirs()) {
        const pkg = await readExtensionPackageJson(ext);
        await writeExtensionPackageJson(ext, fixExtensionPackageJson(ext, pkg, overrides));
    }
}

if (import.meta.main) await fixExtensions();
