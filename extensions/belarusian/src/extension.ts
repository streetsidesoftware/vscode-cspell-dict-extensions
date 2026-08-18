// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

// 
const locale = 'be';
// 

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    if (extension) {
        extension.activate().then(ext => {
            // We need to register the dictionary configuration with the Code Spell Checker Extension
            ext?.registerConfig?.(configLocation);
        });
    }

    // 
    function enable(isGlobal: boolean) {
        extension && extension.activate().then(ext => {
            ext?.enableLocale?.(isGlobal, locale);
        });
    }

    function disable(isGlobal: boolean) {
        extension && extension.activate().then(ext => {
            ext?.disableLocale?.(isGlobal, locale);
        });
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_belarusian.enable', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_belarusian.disable', () => disable(true)),
        vscode.commands.registerCommand('cSpellExt_belarusian.enableWorkspace', () => enable(false)),
        vscode.commands.registerCommand('cSpellExt_belarusian.disableWorkspace', () => disable(false)),
    );
    // 
}

// this method is called when your extension is deactivated
export function deactivate() {
}
