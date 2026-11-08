/**
 * What the repository's README lists and release-please configures for each extension.
 */

import { readConfigKind } from '../config/index.mts';
import type { ExtensionKind } from '../extension-runtime-api.mts';
import { readExtensionPackageJson } from './packageJson.mts';

export interface ExtensionInfo {
    packageName: string;
    displayName: string;
    displayNameShort: string;
    version: string;
    description: string;
    /** The extension's directory as a repo path, e.g. `extensions/swedish`. */
    repoPath: string;
    /** The `kind` in the extension's `extension.config.json`; `undefined` without one. */
    kind: ExtensionKind | undefined;
    /** `vsce.preRelease` in the extension's package.json */
    preRelease: boolean;
}

export async function getExtensionInfo(repoPath: string): Promise<ExtensionInfo> {
    const pkg = await readExtensionPackageJson(repoPath);
    return {
        packageName: pkg.name,
        description: pkg.description,
        displayName: pkg.displayName,
        displayNameShort: pkg.displayName.replace(/ -.*/, '').trim(),
        version: pkg.version,
        repoPath,
        kind: await readConfigKind(repoPath),
        preRelease: pkg.vsce?.preRelease === true,
    };
}
