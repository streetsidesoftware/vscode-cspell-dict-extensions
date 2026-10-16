import * as vscode from 'vscode';

import { parseExtensionConfig, type ResolvedCommand, resolveCommands } from './config.ts';

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
     * Called by `activate`, after the extension's commands are registered. Like `activate`, it must not make
     * VS Code wait: register commands right away and don't return a promise.
     * @param api - resolves once Code Spell Checker is active.
     */
    activate?(context: vscode.ExtensionContext, api: Promise<CodeSpellCheckerApi | undefined>): void;
}

const codeSpellCheckerId = 'streetsidesoftware.code-spell-checker';

/**
 * Activate an extension from its `extension.config.json`: register its commands and its `cspell-ext.json`.
 *
 * This is deliberately not `async`. VS Code waits for the promise `activate` returns, and the extension
 * isn't active until it settles. Waiting here for Code Spell Checker to start can make VS Code report an
 * error, so the commands are registered right away and the config is registered in the background.
 * @param config - the content of `extension.config.json`.
 * @param custom - the extension's `src/custom.ts`, if it has one.
 */
export function activateExtension(context: vscode.ExtensionContext, config: unknown, custom?: CustomModule): void {
    const extension = vscode.extensions.getExtension<CodeSpellCheckerApi>(codeSpellCheckerId);
    const getApi = async () => extension?.activate();

    for (const command of resolveCommands(parseExtensionConfig(config))) {
        context.subscriptions.push(vscode.commands.registerCommand(command.id, () => runCommand(command, getApi)));
    }

    const api = getApi();
    // Register the dictionary configuration with Code Spell Checker.
    api.then((cspell) => cspell?.registerConfig(context.asAbsolutePath('./cspell-ext.json'))).catch((error: unknown) =>
        console.error('Failed to register %s with Code Spell Checker: %o', context.extension.id, error),
    );

    custom?.activate?.(context, api);
}

async function runCommand(command: ResolvedCommand, getApi: () => Promise<CodeSpellCheckerApi | undefined>) {
    const enable = command.action === 'enable';
    const isGlobal = command.scope === 'global';
    switch (command.toggle) {
        case 'locale': {
            const api = await getApi();
            await (enable ? api?.enableLocale(isGlobal, command.value) : api?.disableLocale(isGlobal, command.value));
            return;
        }
        case 'fileType': {
            const api = await getApi();
            await (enable ? api?.enableLanguageId(command.value) : api?.disableLanguageId(command.value));
            return;
        }
        case 'dictionary': {
            await toggleDictionary(command.value, enable, isGlobal);
            return;
        }
    }
}

/**
 * Add `name` or `!name` to `cSpell.dictionaries`. Code Spell Checker has no API for this yet
 * (streetsidesoftware/vscode-spell-checker#5585).
 */
async function toggleDictionary(name: string, enable: boolean, isGlobal: boolean): Promise<void> {
    const settings = vscode.workspace.getConfiguration('cSpell');
    const inspected = settings.inspect<string[]>('dictionaries');
    const current = (isGlobal ? inspected?.globalValue : inspected?.workspaceValue) ?? [];
    const dictionaries = current.filter((d) => d !== name && d !== `!${name}`);
    dictionaries.push(enable ? name : `!${name}`);
    const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
    await settings.update('dictionaries', dictionaries, target);
}
