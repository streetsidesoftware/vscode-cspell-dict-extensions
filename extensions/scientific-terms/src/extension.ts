import * as vscode from 'vscode';

interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
    enableLocale(isGlobal: boolean, local: string): Promise<void>;
    disableLocale(isGlobal: boolean, local: string): Promise<void>;
}

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);

    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push();

    // We need to register the dictionary configuration with the Code Spell Checker Extension
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
