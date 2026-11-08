/**
 * An extension's config, `extension.config.json`: reading, checking, changing and writing it.
 */

export { actions, commandSet, idSuffix, localeSuffix, scopes, standardCommand } from './commandSets.mts';
export type { Target } from './commandSets.mts';
export { addCommandSet, removeCommands, setFields } from './edit.mts';
export type { Fields } from './edit.mts';
export { configFileName, hasConfig, readConfig, readConfigKind, writeConfig } from './extensionConfig.mts';
export { readExtensionConfigValidator } from './schema.mts';
export type { ExtensionConfigValidator } from './schema.mts';
