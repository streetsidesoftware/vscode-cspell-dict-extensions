/**
 * The part of the API with no third-party dependencies: only `node:` modules. Workflows run the scripts that use it
 * before `npm ci`.
 */

export type { ExtensionKind } from '../extension-runtime/api.ts';
export {
    type ExtensionInfo,
    getExtensionInfo,
    type PackageJson,
    readExtensionKind,
    readExtensionPackageJson,
    writeExtensionPackageJson,
} from './src/extensionHelper.mts';
export { extensionsDir, listExtensionRepoPaths } from './src/repo.mts';
