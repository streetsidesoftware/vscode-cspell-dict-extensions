// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocal(isGlobal: boolean, locale: string): Promise<void>;
    disableLocal(isGlobal: boolean, locale: string): Promise<void>;
}

const extName = 'cSpellExt_swedish';
const language = 'Swedish';
const localeEnable = 'sv_SE';
const localeDisable = 'sv_SE';
const commandEnable = `${extName}.enable${language}`;
const commandDisable = `${extName}.disable${language}`;
const commandEnableWorkspace = `${extName}.enable${language}Workspace`;
const commandDisableWorkspace = `${extName}.disable${language}Workspace`;

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

    function enable(isGlobal: boolean) {
        extension &&
            extension.activate().then((ext) => {
                ext?.enableLocal?.(isGlobal, localeEnable);
            });
    }

    function disable(isGlobal: boolean) {
        extension &&
            extension.activate().then((ext) => {
                ext?.disableLocal?.(isGlobal, localeDisable);
            });
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand(commandEnable, () => enable(true)),
        vscode.commands.registerCommand(commandDisable, () => disable(true)),
        vscode.commands.registerCommand(commandEnableWorkspace, () => enable(false)),
        vscode.commands.registerCommand(commandDisableWorkspace, () => disable(false)),
    );
}

// this method is called when your extension is deactivated
export function deactivate() {}
