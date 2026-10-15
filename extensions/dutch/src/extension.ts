// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

//
const locale = 'nl';
//

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    async function enable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, locale);
    }

    async function disable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, locale);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_dutch.enable', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_dutch.disable', () => disable(true)),
        vscode.commands.registerCommand('cSpellExt_dutch.enableWorkspace', () => enable(false)),
        vscode.commands.registerCommand('cSpellExt_dutch.disableWorkspace', () => disable(false)),

        // legacy commands:
        vscode.commands.registerCommand('cSpellExt_dutch.enableDutch', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_dutch.disableDutch', () => disable(true)),
        vscode.commands.registerCommand('cSpellExt_dutch.enableDutchWorkspace', () => enable(false)),
        vscode.commands.registerCommand('cSpellExt_dutch.disableDutchWorkspace', () => disable(false)),
    );

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

// this method is called when your extension is deactivated
export function deactivate() {}
