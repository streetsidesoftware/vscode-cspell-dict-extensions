/**
 * The part of the API with no third-party dependencies: only `node:` modules. Workflows run the scripts that use it
 * before `npm ci`.
 */

export type { ExtensionKind } from '../extension-runtime/api.ts';
export { type ExtensionInfo, getExtensionInfo } from './src/extensionHelper.mts';
export { listExtensionRepoPaths } from './src/repo.mts';
