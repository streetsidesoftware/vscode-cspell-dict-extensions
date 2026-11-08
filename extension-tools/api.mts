/**
 * What the scripts outside extension-tools use from it. They import only this file, or `api-node-only.mts`.
 */

export type { ExtensionInfo, ExtensionKind } from './api-node-only.mts';
export { getExtensionInfo, listExtensionRepoPaths } from './api-node-only.mts';
