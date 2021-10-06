import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocal(isGlobal: boolean, locale: string): Promise<void>;
    disableLocal(isGlobal: boolean, locale: string): Promise<void>;
}

const locale = 'fr-90';
const extName = 'cSpellExt_french-reforme';
const language = 'French';
const localeEnable = locale;
const localeDisable = locale;
const commandEnable = `${extName}.enable${language}`;
const commandDisable = `${extName}.disable${language}`;
const commandEnableWorkspace = `${extName}.enable${language}Workspace`;
const commandDisableWorkspace = `${extName}.disable${language}Workspace`;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    const ext = await extension?.activate();
    if (ext) {
        // We need to register the dictionary configuration with the Code Spell Checker Extension
        ext?.registerConfig?.(configLocation);
    }

    async function enable(isGlobal: boolean) {
        const ext = await extension?.activate();
        if (!ext) return;
        await ext.enableLocal(isGlobal, localeEnable);
    }

    async function disable(isGlobal: boolean) {
        const ext = await extension?.activate();
        if (!ext) return;
        await ext.disableLocal(isGlobal, localeDisable);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand(commandEnable, () => enable(true)),
        vscode.commands.registerCommand(commandDisable, () => disable(true)),
        vscode.commands.registerCommand(commandEnableWorkspace, () => enable(false)),
        vscode.commands.registerCommand(commandDisableWorkspace, () => disable(false))
    );
}

// this method is called when your extension is deactivated
export function deactivate() {}
