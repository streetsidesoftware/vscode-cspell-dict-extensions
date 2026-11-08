/**
 * The part of the API with no third-party dependencies: only `node:` modules. Workflows run the scripts that use it
 * before `npm ci`.
 */

export type { ExtensionKind } from './src/extension-runtime-api.mts';
export type { ExtensionInfo } from './src/extension/index.mts';
export { getExtensionInfo, listExtensionRepoPaths } from './src/extension/index.mts';
