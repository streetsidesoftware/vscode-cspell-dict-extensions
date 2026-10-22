/**
 * The data in an extension's `extension.config.json`.
 *
 * These types are the source of truth: the runtime's build generates `extension.config.schema.json` from
 * `ExtensionConfig`, and every `extension.config.json` is checked against it before it's bundled. The runtime trusts
 * the bundled config.
 *
 * The tools that work on extensions use these types too, so this file must not import `vscode`.
 */

/** Where an extension's cspell configuration is, relative to the extension. */
export type CSpellExtPath = 'static/cspell-ext.json';
export const cspellExtPath: CSpellExtPath = 'static/cspell-ext.json';

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
     * The command ID, e.g. `cSpellExt_swedish.enable`. Unique within the extension.
     * @minLength 1
     */
    id: string;
    /**
     * The command title, e.g. `Enable Swedish Spell Checker Dictionary`.
     * @minLength 1
     */
    title: string;
    /**
     * Whether the command is listed in `package.json` (`contributes.commands`), the Command Palette and the README.
     * A command that isn't is still registered, so keybindings and tasks that use its ID keep working.
     * Default: `true`.
     */
    contributes?: boolean;
    /** The command is a holdover from an old way of doing things, i.e. an old command ID. For maintainers. */
    legacy?: boolean;
    /** Notes for maintainers: why this command is the way it is. */
    notes?: string;
}

/** A command that changes a locale (`cSpell.language`) or a dictionary (`cSpell.dictionaries`). */
export interface ScopedCommandConfig extends CommandBase {
    /** What the command changes: a locale (`cSpell.language`) or a dictionary (`cSpell.dictionaries`). */
    toggle: 'locale' | 'dictionary';
    /** Where the setting is written. */
    scope: Scope;
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
     * The extension's published identity: its `package.json` name is `code-spell-checker-<name>`. It doesn't change
     * after the extension is published.
     * @pattern ^[a-z0-9]+(-[a-z0-9]+)*$
     */
    name: string;
    /**
     * The name shown in VS Code and the Marketplace, e.g. `Swedish`.
     * @minLength 1
     */
    friendlyName: string;
    /**
     * The Marketplace name, e.g. `Swedish - Code Spell Checker`.
     * @minLength 1
     */
    displayName: string;
    /**
     * The Marketplace description.
     * @minLength 1
     */
    description: string;
    /**
     * The document opened by the VS Code test, relative to the extension.
     * @minLength 1
     */
    sample: string;
    /**
     * The content of `static/cspell-ext.json`. The sync adds the `engines` the imported dictionaries declare. Set
     * `engines` here only to override them or the defaults in `static/engines.json`.
     */
    cspell: Record<string, unknown>;
    /** The commands the extension contributes. */
    commands: CommandConfig[];
    /**
     * Notes for maintainers: why something in this file is the way it is.
     */
    notes?: string;
}

/** A natural language, enabled by its locale, e.g. Swedish. */
export interface LanguageExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'language';
    /**
     * The language's primary locale, as a BCP 47 tag, e.g. `sv-SE`.
     * @minLength 1
     */
    locale: string;
    /**
     * The language's name in the language itself, e.g. `svenska`.
     * @minLength 1
     */
    nativeName?: string;
}

/** A list of words, enabled by dictionary name, e.g. medical terms. */
export interface WordListExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'wordList';
}

/** A collection of dictionaries, e.g. the latest copies of the dictionaries Code Spell Checker bundles. */
export interface BundleExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'bundle';
}

/** A cspell parser for a programming language. */
export interface ParserExtensionConfig extends ExtensionConfigBase {
    /** What the extension is. */
    kind: 'parser';
}

/** The data of an extension in `extensions/`. */
export type ExtensionConfig =
    LanguageExtensionConfig | WordListExtensionConfig | BundleExtensionConfig | ParserExtensionConfig;

export type ExtensionKind = ExtensionConfig['kind'];
