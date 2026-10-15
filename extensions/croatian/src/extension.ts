import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, local: string): Promise<void>;
    disableLocale(isGlobal: boolean, local: string): Promise<void>;
}

const local = 'hr';

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    async function enableCroatian(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, local);
    }

    async function disableCroatian(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, local);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_croatian.enableCroatian', () => enableCroatian(true)),
        vscode.commands.registerCommand('cSpellExt_croatian.disableCroatian', () => disableCroatian(true)),
        vscode.commands.registerCommand('cSpellExt_croatian.enableCroatianWorkspace', () => enableCroatian(false)),
        vscode.commands.registerCommand('cSpellExt_croatian.disableCroatianWorkspace', () => disableCroatian(false)),
    );

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
