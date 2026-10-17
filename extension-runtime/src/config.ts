/**
 * The data in an extension's `extension.config.json`.
 *
 * These types are the source of truth: `npm run sync:extensions` generates `static/extension.config.schema.json`
 * from `ExtensionConfig` and validates every `extension.config.json` against it. The runtime trusts the bundled
 * config, because the sync has checked it.
 *
 * This file is shared by the extension runtime (bundled into each extension) and by the sync script,
 * so it must not import `vscode`.
 */

/** Where the sync writes an extension's cspell configuration, relative to the extension. */
export const cspellExtPath = 'static/cspell-ext.json';

/** Turn the toggle on or off. */
export type Action = 'enable' | 'disable';

/** Where the setting is written. */
export type Scope = 'global' | 'workspace';

interface CommandBase {
    /** Turn the toggle on or off. */
    action: Action;
    /**
     * The locale, dictionary name, or file type (language ID).
     * @minLength 1
     */
    value: string;
    /**
     * The command ID. Default: `cSpellExt_<name>.<action>`, with `Workspace` appended for the workspace scope.
     * @minLength 1
     */
    id?: string;
    /**
     * The command title. Default: `<Action> <friendlyName> Spell Checker Dictionary`, with ` in Workspace` appended
     * for the workspace scope.
     * @minLength 1
     */
    title?: string;
    /**
     * Whether the command is listed in `package.json` (`contributes.commands`), the Command Palette and the README.
     * A command that isn't is still registered, so keybindings and tasks that use its ID keep working.
     * Default: `true`.
     */
    contributes?: boolean;
    /** The command is a holdover from an old way of doing things, i.e. an old command ID. For maintainers. */
    legacy?: boolean;
    /** Notes for maintainers: why this command is the way it is. Not used by the sync. */
    notes?: string;
}

/** A command that changes a locale (`cSpell.language`) or a dictionary (`cSpell.dictionaries`). */
export interface ScopedCommandConfig extends CommandBase {
    /** What the command changes: a locale (`cSpell.language`) or a dictionary (`cSpell.dictionaries`). */
    toggle: 'locale' | 'dictionary';
    /** Where the setting is written. Default: `global`. */
    scope?: Scope;
}

/** A command that turns spell checking on or off for a file type (`cSpell.enabledFileTypes`). It has no scope. */
export interface FileTypeCommandConfig extends CommandBase {
    /** What the command changes: a file type (`cSpell.enabledFileTypes`). */
    toggle: 'fileType';
}

export type CommandConfig = ScopedCommandConfig | FileTypeCommandConfig;

export type Toggle = CommandConfig['toggle'];

/** The fields every kind of extension has. */
interface ExtensionConfigBase {
    /** The JSON schema of this file. */
    $schema?: string;
    /**
     * The extension's directory in `extensions/`. Also the default command ID prefix: `cSpellExt_<name>`.
     * @pattern ^[a-z0-9]+(-[a-z0-9]+)*$
     */
    name: string;
    /**
     * The name shown to people, i.e. `Swedish`.
     * @minLength 1
     */
    friendlyName: string;
    /**
     * The Marketplace name. Default: `<friendlyName> - Code Spell Checker`.
     * @minLength 1
     */
    displayName?: string;
    /**
     * The Marketplace description. Default: `<friendlyName> dictionary extension for VS Code.`
     * @minLength 1
     */
    description?: string;
    /**
     * The document opened by the VS Code test, relative to the extension.
     * @minLength 1
     */
    sample: string;
    /**
     * The content of `static/cspell-ext.json`. Set `engines` here only to override the defaults in
     * `static/engines.json`.
     */
    cspell: Record<string, unknown>;
    /** The commands the extension contributes. */
    commands: CommandConfig[];
    /**
     * Notes for maintainers: why something in this file is the way it is. Not used by the sync.
     */
    notes?: string;
}

/** A natural language, enabled by its locale, i.e. Swedish. */
export interface LanguageExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'language';
    /**
     * The locale people add to `cSpell.language` to use this language, as a BCP 47 tag (i.e. `sv-SE`) or a comma-separated list of them.
     * @minLength 1
     */
    locale: string;
    /**
     * The language's name in the language itself, i.e. `svenska`.
     * @minLength 1
     */
    nativeName?: string;
}

/** A list of words, enabled by dictionary name, i.e. medical terms. */
export interface WordListExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'wordList';
}

/** A collection of dictionaries, i.e. the latest copies of the dictionaries Code Spell Checker bundles. */
export interface BundleExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'bundle';
}

/** A cspell parser for a programming language. */
export interface ParserExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'parser';
}

/** The data of an extension in `extensions/`. `npm run sync:extensions` derives the extension's files from it. */
export type ExtensionConfig =
    LanguageExtensionConfig | WordListExtensionConfig | BundleExtensionConfig | ParserExtensionConfig;

export type ExtensionKind = ExtensionConfig['kind'];

export interface ResolvedCommand {
    id: string;
    title: string;
    /** Listed in `package.json`, the Command Palette and the README; registered either way. */
    contributes: boolean;
    action: Action;
    toggle: Toggle;
    value: string;
    scope: Scope;
}

export function displayName(config: ExtensionConfig): string {
    return config.displayName ?? `${config.friendlyName} - Code Spell Checker`;
}

export function description(config: ExtensionConfig): string {
    return config.description ?? `${config.friendlyName} dictionary extension for VS Code.`;
}

/**
 * Fill in the default ID, title and scope of each command.
 */
export function resolveCommands(config: ExtensionConfig): ResolvedCommand[] {
    return config.commands.map((command) => {
        const scope = (command.toggle !== 'fileType' && command.scope) || 'global';
        const inWorkspace = scope === 'workspace';
        const action = command.action === 'enable' ? 'Enable' : 'Disable';
        return {
            id: command.id ?? `cSpellExt_${config.name}.${command.action}${inWorkspace ? 'Workspace' : ''}`,
            title:
                command.title ??
                `${action} ${config.friendlyName} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
            contributes: command.contributes ?? true,
            action: command.action,
            toggle: command.toggle,
            value: command.value,
            scope,
        };
    });
}

/**
 * The command IDs used more than once. A schema can't express this, so the sync checks it.
 */
export function duplicateCommandIds(config: ExtensionConfig): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const { id } of resolveCommands(config)) {
        if (seen.has(id)) duplicates.add(id);
        seen.add(id);
    }
    return [...duplicates];
}
