'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dict from 'cspell-dict-pt-br';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocal(isGlobal: boolean, local: string): Promise<void>;
    disableLocal(isGlobal: boolean, local: string): Promise<void>;
}


const local = 'pt,pt_BR';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    if (extension) {
        extension.activate().then(ext => {
            const path = dict.getConfigLocation();
            // We need to register the dictionary configuration with the Code Spell Checker Extension
            ext && ext.registerConfig && ext.registerConfig(path);
        });
    }

    
    function enablePortuguese_brazilian(isGlobal: boolean) {
        extension && extension.activate().then(ext => {
            ext && ext.enableLocal && ext.enableLocal(isGlobal, local);
        });
    }

    function disablePortuguese_brazilian(isGlobal: boolean) {
        extension && extension.activate().then(ext => {
            ext && ext.disableLocal && ext.disableLocal(isGlobal, local);
        });
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_portuguese-brazilian.enablePortuguese_brazilian', () => enablePortuguese_brazilian(true)),
        vscode.commands.registerCommand('cSpellExt_portuguese-brazilian.disablePortuguese_brazilian', () => disablePortuguese_brazilian(true)),
        vscode.commands.registerCommand('cSpellExt_portuguese-brazilian.enablePortuguese_brazilianWorkspace', () => enablePortuguese_brazilian(false)),
        vscode.commands.registerCommand('cSpellExt_portuguese-brazilian.disablePortuguese_brazilianWorkspace', () => disablePortuguese_brazilian(false)),
    );
    
}

// this method is called when your extension is deactivated
export function deactivate() {
}