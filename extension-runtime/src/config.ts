/**
 * The data in an extension's `extension.config.json`.
 *
 * This file is shared by the extension runtime (bundled into each extension) and by the sync script,
 * so it must not import `vscode`.
 */

/** Where the sync writes an extension's cspell configuration, relative to the extension. */
export const cspellExtPath = 'static/cspell-ext.json';

export const toggles = ['locale', 'dictionary', 'fileType'] as const;
export type Toggle = (typeof toggles)[number];

export const actions = ['enable', 'disable'] as const;
export type Action = (typeof actions)[number];

export const scopes = ['global', 'workspace'] as const;
export type Scope = (typeof scopes)[number];

export interface CommandConfig {
    /** Turn the toggle on or off. */
    action: Action;
    /** What the command changes. */
    toggle: Toggle;
    /** The locale, dictionary name, or file type (language ID). */
    value: string;
    /** Where the setting is written. Not used by `fileType`. Default: `global`. */
    scope?: Scope;
    /** The command ID. Default: `cSpellExt_<name>.<action>`, with `Workspace` appended for the workspace scope. */
    id?: string;
    /** The command title. Default: `<Action> <friendlyName> Spell Checker Dictionary`, with ` in Workspace` appended. */
    title?: string;
}

export interface ExtensionConfig {
    /** The extension's directory in `extensions/`. */
    name: string;
    /** The name shown to people, i.e. `Swedish`. */
    friendlyName: string;
    /** The Marketplace name. Default: `<friendlyName> - Code Spell Checker`. */
    displayName?: string;
    /** The Marketplace description. Default: `<friendlyName> dictionary extension for VS Code.` */
    description?: string;
    /** The document opened by the VS Code test, relative to the extension. */
    sample: string;
    /** The content of `static/cspell-ext.json`, without `engines`. */
    cspell: Record<string, unknown>;
    /** Overrides of the minimum versions in `static/engines.json`, i.e. `{ "cspell": ">=10.4.0" }`. */
    engines?: Record<string, string>;
    /** The commands the extension contributes. */
    commands: CommandConfig[];
}

export interface ResolvedCommand {
    id: string;
    title: string;
    action: Action;
    toggle: Toggle;
    value: string;
    scope: Scope;
}

export class ConfigError extends Error {}

const configKeys = new Set([
    '$schema',
    'name',
    'friendlyName',
    'displayName',
    'description',
    'sample',
    'cspell',
    'engines',
    'commands',
]);
const commandKeys = new Set(['action', 'toggle', 'value', 'scope', 'id', 'title']);

/**
 * Check the data read from `extension.config.json`.
 * @throws ConfigError when the data doesn't match the schema.
 */
export function parseExtensionConfig(data: unknown): ExtensionConfig {
    const obj = asObject(data, 'extension.config.json');
    checkKnownKeys(obj, configKeys, 'extension.config.json');

    const config: ExtensionConfig = {
        name: asString(obj.name, 'name'),
        friendlyName: asString(obj.friendlyName, 'friendlyName'),
        sample: asString(obj.sample, 'sample'),
        cspell: asObject(obj.cspell, 'cspell'),
        commands: asArray(obj.commands, 'commands').map((c, i) => parseCommand(c, `commands[${i}]`)),
    };
    if (obj.displayName !== undefined) config.displayName = asString(obj.displayName, 'displayName');
    if (obj.description !== undefined) config.description = asString(obj.description, 'description');
    if (obj.engines !== undefined) {
        const engines = asObject(obj.engines, 'engines');
        config.engines = Object.fromEntries(
            Object.entries(engines).map(([key, value]) => [key, asString(value, `engines.${key}`)]),
        );
    }
    if ('engines' in config.cspell) {
        throw new ConfigError('cspell.engines: set the engines in "engines", not in "cspell".');
    }

    const ids = new Set<string>();
    for (const command of resolveCommands(config)) {
        if (ids.has(command.id)) {
            throw new ConfigError(`Duplicate command ID "${command.id}". Give the commands explicit IDs.`);
        }
        ids.add(command.id);
    }

    return config;
}

function parseCommand(data: unknown, path: string): CommandConfig {
    const obj = asObject(data, path);
    checkKnownKeys(obj, commandKeys, path);
    const command: CommandConfig = {
        action: asOneOf(obj.action, actions, `${path}.action`),
        toggle: asOneOf(obj.toggle, toggles, `${path}.toggle`),
        value: asString(obj.value, `${path}.value`),
    };
    if (obj.scope !== undefined) {
        if (command.toggle === 'fileType') {
            throw new ConfigError(`${path}.scope: a fileType toggle has no scope.`);
        }
        command.scope = asOneOf(obj.scope, scopes, `${path}.scope`);
    }
    if (obj.id !== undefined) command.id = asString(obj.id, `${path}.id`);
    if (obj.title !== undefined) command.title = asString(obj.title, `${path}.title`);
    return command;
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
        const scope = command.scope ?? 'global';
        const inWorkspace = scope === 'workspace';
        const action = command.action === 'enable' ? 'Enable' : 'Disable';
        return {
            id: command.id ?? `cSpellExt_${config.name}.${command.action}${inWorkspace ? 'Workspace' : ''}`,
            title:
                command.title ??
                `${action} ${config.friendlyName} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
            action: command.action,
            toggle: command.toggle,
            value: command.value,
            scope,
        };
    });
}

function asObject(value: unknown, path: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new ConfigError(`${path}: expected an object.`);
    }
    return value as Record<string, unknown>;
}

function asArray(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) throw new ConfigError(`${path}: expected an array.`);
    return value;
}

function asString(value: unknown, path: string): string {
    if (typeof value !== 'string' || !value) throw new ConfigError(`${path}: expected a non-empty string.`);
    return value;
}

function asOneOf<T extends string>(value: unknown, choices: readonly T[], path: string): T {
    if (!choices.includes(value as T)) {
        throw new ConfigError(`${path}: expected one of ${choices.map((c) => `"${c}"`).join(', ')}.`);
    }
    return value as T;
}

function checkKnownKeys(obj: Record<string, unknown>, known: Set<string>, path: string): void {
    const unknownKeys = Object.keys(obj).filter((key) => !known.has(key));
    if (unknownKeys.length) {
        throw new ConfigError(`${path}: unknown ${unknownKeys.map((k) => `"${k}"`).join(', ')}.`);
    }
}
