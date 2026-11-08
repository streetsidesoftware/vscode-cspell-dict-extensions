/**
 * The extensions in `extensions/`: listing and picking them, their `package.json` and pre-release mode, the facts the
 * repository's README lists, the packages that already have one, and removing one.
 */

export { findExistingExtensions } from './existing.mts';
export { getExtensionInfo } from './extensionInfo.mts';
export type { ExtensionInfo } from './extensionInfo.mts';
export { listExtensionRepoPaths, pickExtension } from './extensions.mts';
export type { Extension } from './extensions.mts';
export { readExtensionPackageJson, withSharedFields, writeExtensionPackageJson } from './packageJson.mts';
export type { ExtensionPackageJson } from './packageJson.mts';
export { setPreRelease } from './preRelease.mts';
export { removeExtension } from './remove.mts';
