/**
 * Changes to an extension's config: the commands and the scalar fields. Each function returns a new config; the
 * caller writes it.
 */

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/api.ts';
import { commandSet, idSuffix } from './commandSets.mts';

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
    const first = !config.commands.some((command) => command.toggle === toggle);
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
    if (toggle === 'dictionary') return idSuffix(value);
    const [language = value, ...subtags] = value.split(/[-_]/);
    return idSuffix(subtags.join('-') || language);
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
    /** `cspell.engines`: a range per engine, or `''` to remove one. */
    engines?: Record<string, string> | undefined;
}

/**
 * Set scalar fields. A new `friendlyName` also renames the command titles that follow the standard pattern
 * (`… <friendlyName> Spell Checker Dictionary …`). `nativeName` and `locale` are only for a language.
 */
export function setFields(config: ExtensionConfig, fields: Fields): ExtensionConfig {
    const { friendlyName, nativeName, locale, engines, ...plain } = fields;
    if ((nativeName !== undefined || locale !== undefined) && config.kind !== 'language') {
        throw new Error(`--native-name and --locale are only for a language; this extension is a ${config.kind}.`);
    }
    let result: ExtensionConfig = { ...config, ...defined(plain) };
    if (friendlyName !== undefined) {
        result = {
            ...result,
            friendlyName,
            commands: renameTitles(result.commands, config.friendlyName, friendlyName),
        };
    }
    if (result.kind === 'language') result = { ...result, ...defined({ nativeName, locale }) };
    if (engines) result = { ...result, cspell: withEngines(result.cspell, engines) };
    return result;
}

function renameTitles(commands: CommandConfig[], from: string, to: string): CommandConfig[] {
    const standard = ` ${from} Spell Checker Dictionary`;
    return commands.map((command) =>
        command.title.includes(standard)
            ? { ...command, title: command.title.replace(standard, ` ${to} Spell Checker Dictionary`) }
            : command,
    );
}

function withEngines(cspell: Record<string, unknown>, changes: Record<string, string>): Record<string, unknown> {
    const engines = { ...(cspell['engines'] as Record<string, string> | undefined) };
    for (const [engine, range] of Object.entries(changes)) {
        if (range) engines[engine] = range;
        else delete engines[engine];
    }
    if (Object.keys(engines).length) return { ...cspell, engines };
    const { engines: _removed, ...rest } = cspell;
    return rest;
}

function defined<T extends object>(fields: T): Partial<T> {
    return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)) as Partial<T>;
}
