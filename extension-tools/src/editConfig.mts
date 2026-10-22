/**
 * Changes to an extension's config: the commands and the scalar fields. Each function returns a new config; the
 * caller writes it.
 */

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/api.ts';
import { commandSet, idSuffix, localeSuffix } from './commandSets.mts';

export interface CommandSetOptions {
    /** Names what the commands turn on in the titles. */
    label?: string | undefined;
    /** Added to the IDs after the action. */
    suffix?: string | undefined;
}

/**
 * Add the four standard commands (Enable and Disable, globally and in the workspace) for a locale or a dictionary.
 *
 * The first set of a toggle gets the plain IDs and titles, e.g. `cSpellExt_swedish.enable`, `Enable Swedish Spell
 * Checker Dictionary`. A later set gets its own: a dictionary is named after itself (`vim-script` gives
 * `enableVimScript`), a locale after its language (`sr-Cyrl` gives `enableCyrl`, `Enable Serbian (Cyrillic) …`).
 */
export function addCommandSet(
    config: ExtensionConfig,
    toggle: 'locale' | 'dictionary',
    value: string,
    options: CommandSetOptions = {},
): ExtensionConfig {
    if (toggle === 'locale' && /[\s,|;]/.test(value)) {
        throw new Error(`--locale ${value}: give one locale. A command for a list of locales is edited in the config.`);
    }
    const existing = config.commands.find((command) => command.toggle === toggle && command.value === value);
    if (existing) throw new Error(`${existing.id} already turns ${toggle} "${value}" on or off.`);
    // IDs are unique per extension: only the extension's first commands get the plain IDs.
    const first = config.commands.length === 0;
    const label = options.label ?? (first ? config.friendlyName : defaultLabel(toggle, value));
    const suffix = options.suffix ?? (first ? '' : defaultSuffix(toggle, value));
    const added = commandSet({ name: config.name, label, suffix, toggle }, value);
    const taken = added.filter((command) => config.commands.some((c) => c.id === command.id)).map((c) => c.id);
    if (taken.length) throw new Error(`The extension already has ${taken.join(', ')}. Give the set a --suffix.`);
    return { ...config, commands: [...config.commands, ...added] };
}

function defaultLabel(toggle: 'locale' | 'dictionary', value: string): string {
    if (toggle === 'dictionary') return value;
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(value) ?? value;
}

function defaultSuffix(toggle: 'locale' | 'dictionary', value: string): string {
    return toggle === 'dictionary' ? idSuffix(value) : localeSuffix(value);
}

/** Remove commands by ID. */
export function removeCommands(config: ExtensionConfig, ids: readonly string[]): ExtensionConfig {
    const missing = ids.filter((id) => !config.commands.some((command) => command.id === id));
    if (missing.length) throw new Error(`The extension has no command ${missing.join(', ')}.`);
    return { ...config, commands: config.commands.filter((command) => !ids.includes(command.id)) };
}

/** The scalar fields `set` changes. */
export interface Fields {
    friendlyName?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    notes?: string | undefined;
    nativeName?: string | undefined;
    locale?: string | undefined;
    sample?: string | undefined;
}

/** The fields an extension may leave out: `''` removes them. */
const optionalFields = ['notes', 'nativeName'] as const;

/**
 * Set scalar fields. A new `friendlyName` also renames the command titles that follow the standard pattern
 * (`… <friendlyName> Spell Checker Dictionary …`), but not `displayName` or `description`. `nativeName` and `locale`
 * are only for a language. An empty `notes` or `nativeName` removes it.
 */
export function setFields(config: ExtensionConfig, fields: Fields): ExtensionConfig {
    const { friendlyName, nativeName, locale, ...plain } = fields;
    if ((nativeName !== undefined || locale !== undefined) && config.kind !== 'language') {
        throw new Error(`--native-name and --locale are only for a language; this extension is a ${config.kind}.`);
    }
    let result: Record<string, unknown> = { ...config, ...defined(plain) };
    if (friendlyName !== undefined) {
        const commands = renameTitles(config.commands, config.friendlyName, friendlyName);
        result = { ...result, friendlyName, commands };
    }
    if (config.kind === 'language') result = { ...result, ...defined({ nativeName, locale }) };
    for (const field of optionalFields) {
        if (result[field] === '') delete result[field];
    }
    return result as unknown as ExtensionConfig;
}

function renameTitles(commands: CommandConfig[], from: string, to: string): CommandConfig[] {
    const standard = ` ${from} Spell Checker Dictionary`;
    return commands.map((command) =>
        command.title.includes(standard)
            ? { ...command, title: command.title.replace(standard, () => ` ${to} Spell Checker Dictionary`) }
            : command,
    );
}

function defined<T extends object>(fields: T): Partial<T> {
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as Partial<T>;
}
