import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
}

const locale = 'bg_BG';

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    async function enableBulgarian(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, locale);
    }

    async function disableBulgarian(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, locale);
    }

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_bulgarian.enableBulgarian', () => enableBulgarian(true)),
        vscode.commands.registerCommand('cSpellExt_bulgarian.disableBulgarian', () => disableBulgarian(true)),
        vscode.commands.registerCommand('cSpellExt_bulgarian.enableBulgarianWorkspace', () => enableBulgarian(false)),
        vscode.commands.registerCommand('cSpellExt_bulgarian.disableBulgarianWorkspace', () => disableBulgarian(false)),
    );

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
