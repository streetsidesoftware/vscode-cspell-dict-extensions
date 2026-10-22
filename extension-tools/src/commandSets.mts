/**
 * The standard commands: Enable and Disable, globally and in the workspace, for one locale or dictionary.
 */

import type { CommandConfig } from '../../extension-runtime/api.ts';

type Action = CommandConfig['action'];
type Scope = Extract<CommandConfig, { scope: unknown }>['scope'];

export const scopes: readonly Scope[] = ['global', 'workspace'];
export const actions: readonly Action[] = ['enable', 'disable'];

/** What a set of commands turns on and off. */
export interface Target {
    /** The extension's `name`, which starts the ID. */
    name: string;
    /** Names what the commands turn on in the title, e.g. `Serbian (Cyrillic)`. */
    label: string;
    /** Added to the ID after the action, e.g. `Cyrl`. */
    suffix: string;
    toggle: 'locale' | 'dictionary';
}

/**
 * A command with the standard ID and title, e.g. `cSpellExt_swedish.enableWorkspace` titled `Enable Swedish Spell
 * Checker Dictionary in Workspace`.
 */
export function standardCommand(
    { name, label, suffix, toggle }: Target,
    value: string,
    action: Action,
    scope: Scope,
): CommandConfig {
    const inWorkspace = scope === 'workspace';
    const verb = action === 'enable' ? 'Enable' : 'Disable';
    return {
        id: `cSpellExt_${name}.${action}${suffix}${inWorkspace ? 'Workspace' : ''}`,
        title: `${verb} ${label} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
        action,
        toggle,
        value,
        scope,
    };
}

/** The four standard commands for one value. */
export function commandSet(target: Target, value: string): CommandConfig[] {
    return scopes.flatMap((scope) => actions.map((action) => standardCommand(target, value, action, scope)));
}

/** The ID suffix of a locale: its subtags after the language, or the language when there are none. `sr-Cyrl` gives `Cyrl`. */
export function localeSuffix(locale: string): string {
    const [language = locale, ...subtags] = locale.split(/[-_]/);
    const suffix = subtags.join('') || language;
    return suffix.slice(0, 1).toUpperCase() + suffix.slice(1);
}

/** An ID suffix from a name: each word capitalized, e.g. `vim-script` gives `VimScript`. */
export function idSuffix(name: string): string {
    return name
        .split(/[^\p{L}\p{N}]+/u)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join('');
}
