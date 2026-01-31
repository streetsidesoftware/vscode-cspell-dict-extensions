import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocal(isGlobal: boolean, locale: string): Promise<void>;
    disableLocal(isGlobal: boolean, locale: string): Promise<void>;
}

const extName = 'cSpellExt_armenian';
const language = 'Armenian';
const localeEnable = 'hy';
const localeDisable = 'hy';
const commandEnable = `${extName}.enable${language}`;
const commandDisable = `${extName}.disable${language}`;
const commandEnableWorkspace = `${extName}.enable${language}Workspace`;
const commandDisableWorkspace = `${extName}.disable${language}Workspace`;

export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    const ext = await extension?.activate();
    if (ext) {
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

    context.subscriptions.push(
        vscode.commands.registerCommand(commandEnable, () => enable(true)),
        vscode.commands.registerCommand(commandDisable, () => disable(true)),
        vscode.commands.registerCommand(commandEnableWorkspace, () => enable(false)),
        vscode.commands.registerCommand(commandDisableWorkspace, () => disable(false)),
    );
}

export function deactivate() {}
