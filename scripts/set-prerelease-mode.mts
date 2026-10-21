#!/usr/bin/env node

/**
 * Turn an extension's pre-release mode on or off.
 *
 * Usage: set-prerelease-mode.mts <extension> <true|false>
 *
 * While `vsce.preRelease` is `true` in an extension's `package.json`, `vsce` publishes every release of it
 * as a pre-release. Modeled on `scripts/set-prerelease-mode.js` in streetsidesoftware/vscode-spell-checker.
 */

import { readExtensionPackageJson, writeExtensionPackageJson } from '../extension-tools/api-node-only.mts';

async function run(): Promise<void> {
    const [name, mode, ...rest] = process.argv.slice(2);
    if (!name || !/^[a-z0-9-]+$/.test(name) || !(mode === 'true' || mode === 'false') || rest.length) {
        console.error('Usage: set-prerelease-mode.mts <extension> <true|false>');
        process.exitCode = 1;
        return;
    }

    const repoPath = `extensions/${name}`;
    const pkg = await readExtensionPackageJson(repoPath);
    const vsce = pkg.vsce ?? {};
    const isPrerelease = mode === 'true';

    if (!!vsce.preRelease === isPrerelease) {
        console.log(`extensions/${name}: pre-release mode is already ${isPrerelease}.`);
        return;
    }

    pkg.vsce = { ...vsce, preRelease: isPrerelease || undefined };
    await writeExtensionPackageJson(repoPath, pkg);
    console.log(`extensions/${name}: pre-release mode is now ${isPrerelease}.`);
}

await run();
