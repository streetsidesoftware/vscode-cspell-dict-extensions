import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

const locale = 'sr';
const localeCyrl = 'sr-Cyrl';
const localeLatn = 'sr-Latn';

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    async function enable(isGlobal: boolean, useLocale = locale) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, useLocale);
    }

    async function disable(isGlobal: boolean, useLocale = locale) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, useLocale);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_serbian.enable', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_serbian.enableCyrl', () => enable(true, localeCyrl)),
        vscode.commands.registerCommand('cSpellExt_serbian.enableLatn', () => enable(true, localeLatn)),
        vscode.commands.registerCommand('cSpellExt_serbian.disable', () => disable(true)),
        vscode.commands.registerCommand('cSpellExt_serbian.disableCyrl', () => disable(true, localeCyrl)),
        vscode.commands.registerCommand('cSpellExt_serbian.disableLatn', () => disable(true, localeLatn)),
        vscode.commands.registerCommand('cSpellExt_serbian.enableWorkspace', () => enable(false)),
        vscode.commands.registerCommand('cSpellExt_serbian.disableWorkspace', () => disable(false)),
    );

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
