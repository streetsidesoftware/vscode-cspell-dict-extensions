import * as vscode from 'vscode';

import { type CommandConfig, cspellExtPath, type ExtensionConfig } from './config.ts';

/** The part of the Code Spell Checker extension API used by the extensions. */
export interface CodeSpellCheckerApi {
    registerConfig(path: string): void;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
    enableLanguageId(languageId: string, uri?: string): Promise<void>;
    disableLanguageId(languageId: string, uri?: string): Promise<void>;
}

/** The optional `src/custom.ts` of an extension. */
export interface CustomModule {
    /**
     * Called by `activate`, after the extension's commands are registered.
     * @param api - resolves once Code Spell Checker is active.
     */
    activate?(context: vscode.ExtensionContext, api: Promise<CodeSpellCheckerApi | undefined>): void | Promise<void>;
}

type Extension = vscode.Extension<CodeSpellCheckerApi> | undefined;

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
    const api = getApi(extension);

    for (const command of config.commands) {
        context.subscriptions.push(vscode.commands.registerCommand(command.id, () => runCommand(command, extension)));
    }

    // Register the dictionary configuration with Code Spell Checker.
    const registered = api.then((cspell) => cspell?.registerConfig(context.asAbsolutePath(cspellExtPath)));

    return Promise.all([registered, custom?.activate?.(context, api)]).then(() => undefined);
}

function getApi(extension: Extension): Promise<CodeSpellCheckerApi | undefined> {
    return Promise.resolve(extension?.activate());
}

function runCommand(command: CommandConfig, extension: Extension): Promise<void> {
    const enable = command.action === 'enable';
    switch (command.toggle) {
        case 'locale': {
            const isGlobal = command.scope === 'global';
            return getApi(extension).then((api) =>
                enable ? api?.enableLocale(isGlobal, command.value) : api?.disableLocale(isGlobal, command.value),
            );
        }
        case 'fileType':
            return getApi(extension).then((api) =>
                enable ? api?.enableLanguageId(command.value) : api?.disableLanguageId(command.value),
            );
        case 'dictionary': {
            const isGlobal = command.scope === 'global';
            return toggleDictionary(command.value, enable, isGlobal);
        }
    }
}

/**
 * Add `name` or `!name` to `cSpell.dictionaries`. Code Spell Checker has no API for this yet
 * (streetsidesoftware/vscode-spell-checker#5585).
 */
function toggleDictionary(name: string, enable: boolean, isGlobal: boolean): Promise<void> {
    const settings = vscode.workspace.getConfiguration('cSpell');
    const inspected = settings.inspect<string[]>('dictionaries');
    const current = (isGlobal ? inspected?.globalValue : inspected?.workspaceValue) ?? [];
    const dictionaries = current.filter((d) => d !== name && d !== `!${name}`);
    dictionaries.push(enable ? name : `!${name}`);
    const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
    return Promise.resolve(settings.update('dictionaries', dictionaries, target));
}
