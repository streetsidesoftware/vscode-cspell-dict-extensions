/**
 * What the tools outside the runtime use from it. They import only this file.
 */

export {
    type CommandConfig,
    cspellExtPath,
    description,
    displayName,
    duplicateCommandIds,
    type ExtensionConfig,
    type ExtensionKind,
    resolveCommands,
} from './src/config.ts';
