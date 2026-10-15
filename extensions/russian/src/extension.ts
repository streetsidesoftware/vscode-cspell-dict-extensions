import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

const extName = 'cSpellExt_russian';
const language = 'Russian';
const localeEnable = 'ru';
const localeDisable = 'ru';
const commandEnable = `${extName}.enable${language}`;
const commandDisable = `${extName}.disable${language}`;
const commandEnableWorkspace = `${extName}.enable${language}Workspace`;
const commandDisableWorkspace = `${extName}.disable${language}Workspace`;

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    async function enable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, localeEnable);
    }

    async function disable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, localeDisable);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand(commandEnable, () => enable(true)),
        vscode.commands.registerCommand(commandDisable, () => disable(true)),
        vscode.commands.registerCommand(commandEnableWorkspace, () => enable(false)),
        vscode.commands.registerCommand(commandDisableWorkspace, () => disable(false)),
    );

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
