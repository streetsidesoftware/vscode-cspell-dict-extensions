'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const dict = require("cspell-dict-hr-hr");
const local = 'hr';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const extension = vscode.extensions.getExtension(vscodeSpellCheckerExtension);
    if (extension) {
        extension.activate().then(ext => {
            const path = dict.getConfigLocation();
            // We need to register the dictionary configuration with the Code Spell Checker Extension
            ext && ext.registerConfig && ext.registerConfig(path);
        });
    }
    function enableCroatian(isGlobal) {
        extension && extension.activate().then(ext => {
            ext && ext.enableLocal && ext.enableLocal(isGlobal, local);
        });
    }
    function disableCroatian(isGlobal) {
        extension && extension.activate().then(ext => {
            ext && ext.disableLocal && ext.disableLocal(isGlobal, local);
        });
    }
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(vscode.commands.registerCommand('cSpellExt_croatian.enableCroatian', () => enableCroatian(true)), vscode.commands.registerCommand('cSpellExt_croatian.disableCroatian', () => disableCroatian(true)), vscode.commands.registerCommand('cSpellExt_croatian.enableCroatianWorkspace', () => enableCroatian(false)), vscode.commands.registerCommand('cSpellExt_croatian.disableCroatianWorkspace', () => disableCroatian(false)));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map