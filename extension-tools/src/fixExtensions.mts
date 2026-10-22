import { sortPackageJson } from 'sort-package-json';

import { fixExtensionPackageJson, readExtensionPackageJson, writeExtensionPackageJson } from './extensionHelper.mts';
import { listExtensionRepoPaths, readVscodeEngine } from './repo.mts';

/**
 * Give every extension's `package.json` the fields the extensions share, and sort it.
 */
export async function fixExtensions(): Promise<void> {
    console.log('Fixing extensions...');
    const overrides = { engines: { vscode: await readVscodeEngine() } };

    for (const repoPath of await listExtensionRepoPaths()) {
        const pkg = await readExtensionPackageJson(repoPath);
        const fixed = fixExtensionPackageJson(repoPath, pkg, overrides);
        await writeExtensionPackageJson(repoPath, sortPackageJson(fixed));
    }
}
