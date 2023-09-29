// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

//
const locale = 'sr';
const localeCyrl = 'sr-Cyrl';
const localeLatn = 'sr-Latn';
//

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    if (extension) {
        extension.activate().then((ext) => {
            // We need to register the dictionary configuration with the Code Spell Checker Extension
            ext?.registerConfig?.(configLocation);
        });
    }

    //
    function enable(isGlobal: boolean, useLocale = locale) {
        extension &&
            extension.activate().then((ext) => {
                ext?.enableLocale?.(isGlobal, useLocale);
            });
    }

    function disable(isGlobal: boolean, useLocale = locale) {
        extension &&
            extension.activate().then((ext) => {
                ext?.disableLocale?.(isGlobal, useLocale);
            });
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
    //
}

// this method is called when your extension is deactivated
export function deactivate() {}
