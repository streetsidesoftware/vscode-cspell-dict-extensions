import * as vscode from 'vscode';

import { cspellExtPath } from './config.ts';
import type { CommandConfig, ExtensionConfig } from './config.ts';

/** The part of the Code Spell Checker extension API used by the extensions. */
export interface CodeSpellCheckerApi {
    registerConfig(path: string): void;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

/** The optional `src/custom.ts` of an extension. */
export interface CustomModule {
    /**
     * Called by `activate`, after the extension's commands are registered.
     * @param api - resolves once Code Spell Checker is active.
     */
    activate?(context: vscode.ExtensionContext, api: Promise<CodeSpellCheckerApi | undefined>): void | Promise<void>;
}

const codeSpellCheckerId = 'streetsidesoftware.code-spell-checker';

/**
 * Activate an extension from its `extension.config.json`: register its commands and its `static/cspell-ext.json`.
 *
 * Not an `async` function: the commands must be registered before `activate` returns, and the rest is a
 * promise chain.
 * @param config - the content of `extension.config.json`, already checked against the schema.
 * @param custom - the extension's `src/custom.ts`, if it has one.
 */
export function activateExtension(
    context: vscode.ExtensionContext,
    config: ExtensionConfig,
    custom?: CustomModule,
): Promise<void> {
    const extension = vscode.extensions.getExtension<CodeSpellCheckerApi>(codeSpellCheckerId);
    const api = Promise.resolve(extension?.activate());

    for (const command of config.commands) {
        context.subscriptions.push(vscode.commands.registerCommand(command.id, commandHandler(command, api)));
    }

    // Register the dictionary configuration with Code Spell Checker.
    const registered = api.then((cspell) => cspell?.registerConfig(context.asAbsolutePath(cspellExtPath)));

    return Promise.all([registered, custom?.activate?.(context, api)]).then(() => undefined);
}

/**
 * The handler of one command, with its action, toggle, value and scope resolved once.
 * @param api - Code Spell Checker's API, once it's active.
 */
function commandHandler(command: CommandConfig, api: Promise<CodeSpellCheckerApi | undefined>): () => Promise<void> {
    const { value } = command;
    const isGlobal = command.scope === 'global';
    const enable = command.action === 'enable';
    if (command.toggle === 'dictionary') return () => toggleDictionary(value, enable, isGlobal);
    return enable
        ? () => api.then((cspell) => cspell?.enableLocale(isGlobal, value))
        : () => api.then((cspell) => cspell?.disableLocale(isGlobal, value));
}

/**
 * Add `name` or `!name` to `cSpell.dictionaries`. Code Spell Checker has no API for this yet
 * (streetsidesoftware/vscode-spell-checker#5585).
 */
function toggleDictionary(name: string, enable: boolean, isGlobal: boolean): Promise<void> {
    const settings = vscode.workspace.getConfiguration('cSpell');
    const inspected = settings.inspect<string[]>('dictionaries');
    const current = (isGlobal ? inspected?.globalValue : inspected?.workspaceValue) ?? [];
    const negated = `!${name}`;
    const dictionaries = current.filter((d) => d !== name && d !== negated);
    dictionaries.push(enable ? name : negated);
    const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
    return Promise.resolve(settings.update('dictionaries', dictionaries, target));
}
