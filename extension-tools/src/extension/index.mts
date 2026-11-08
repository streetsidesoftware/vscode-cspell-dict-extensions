/**
 * The extensions in `extensions/`: finding and picking them, their `package.json`, and removing one.
 */

export { findExistingExtensions } from './existing.mts';
export { getExtensionInfo } from './extensionInfo.mts';
export type { ExtensionInfo } from './extensionInfo.mts';
export { listExtensionRepoPaths, pickExtension } from './extensions.mts';
export type { Extension } from './extensions.mts';
export { readPackageJson, withSharedFields, writePackageJson } from './packageJson.mts';
export type { PackageJson } from './packageJson.mts';
export { setPreRelease } from './preRelease.mts';
export { removeExtension } from './remove.mts';
