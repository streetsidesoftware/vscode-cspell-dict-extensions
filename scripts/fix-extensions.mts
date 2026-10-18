#!/usr/bin/env node

/**
 * Give every extension's `package.json` the fields the extensions share, and sort it.
 */

import { sortPackageJson } from 'sort-package-json';

import {
    fixExtensionPackageJson,
    readExtensionPackageJson,
    writeExtensionPackageJson,
} from './lib/extensionHelper.mts';
import { listExtensionRepoPaths, readVscodeEngine } from './lib/repo.mts';

export async function fixExtensions(): Promise<void> {
    console.log('Fixing extensions...');
    const overrides = { engines: { vscode: await readVscodeEngine() } };

    for (const repoPath of await listExtensionRepoPaths()) {
        const pkg = await readExtensionPackageJson(repoPath);
        const fixed = fixExtensionPackageJson(repoPath, pkg, overrides);
        await writeExtensionPackageJson(repoPath, sortPackageJson(fixed));
    }
}

if (import.meta.main) await fixExtensions();
