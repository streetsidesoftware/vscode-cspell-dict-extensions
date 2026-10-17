import * as vscode from 'vscode';

/** The part of the Code Spell Checker extension API that this extension uses. */
interface CodeSpellCheckerExtension {
    registerConfig(path: string): Promise<void>;
<% if (toggleLocale) { %>
    enableLocale(isGlobal: boolean, locale: string): Promise<void>;
    disableLocale(isGlobal: boolean, locale: string): Promise<void>;
<% } %>
<% if (toggleFileType) { %>
    enableLanguageId(languageId: string): Promise<void>;
    disableLanguageId(languageId: string): Promise<void>;
<% } %>
}

<% if (isScaffold) { %>
// TODO: fill in what the enable / disable commands toggle.
<% } %>
<% if (toggleLocale) { %>
const locale = '<%= locale %>';
<% } %>
<% if (toggleDictionary) { %>
const dictionaries: string[] = <%- dictionariesJson %>;
<% } %>
<% if (toggleFileType) { %>
const languageIds: string[] = [];
<% } %>

/**
 * Called by VS Code when the extension is loaded.
 */
export async function activate(context: vscode.ExtensionContext) {
    const vscodeSpellCheckerExtension = 'streetsidesoftware.code-spell-checker';
    const configLocation = context.asAbsolutePath('./cspell-ext.json');

    const extension = vscode.extensions.getExtension<CodeSpellCheckerExtension>(vscodeSpellCheckerExtension);
<% if (toggleLocale) { %>

    async function enable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.enableLocale(isGlobal, locale);
    }

    async function disable(isGlobal: boolean) {
        const ext = await extension?.activate();
        await ext?.disableLocale(isGlobal, locale);
    }
<% } %>
<% if (toggleDictionary) { %>

    // Code Spell Checker has no API to toggle a dictionary, so update the `cSpell.dictionaries` setting.
    // A `!` before a name turns the dictionary off.
    async function toggle(isGlobal: boolean, on: boolean) {
        const config = vscode.workspace.getConfiguration('cSpell');
        const values = config.inspect<string[]>('dictionaries');
        const current = (isGlobal ? values?.globalValue : values?.workspaceValue) ?? [];
        const names = new Set(dictionaries.flatMap((name) => [name, '!' + name]));
        const updated = [...current.filter((name) => !names.has(name)), ...dictionaries.map((name) => (on ? name : '!' + name))];
        const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
        await config.update('dictionaries', updated, target);
    }

    const enable = (isGlobal: boolean) => toggle(isGlobal, true);
    const disable = (isGlobal: boolean) => toggle(isGlobal, false);
<% } %>
<% if (toggleFileType) { %>

    async function enable() {
        const ext = await extension?.activate();
        for (const languageId of languageIds) await ext?.enableLanguageId(languageId);
    }

    async function disable() {
        const ext = await extension?.activate();
        for (const languageId of languageIds) await ext?.disableLanguageId(languageId);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_<%= name %>.enable', () => enable()),
        vscode.commands.registerCommand('cSpellExt_<%= name %>.disable', () => disable()),
    );
<% } %>
<% if (toggleLocaleOrDictionary) { %>

    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_<%= name %>.enable', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_<%= name %>.disable', () => disable(true)),
        vscode.commands.registerCommand('cSpellExt_<%= name %>.enableWorkspace', () => enable(false)),
        vscode.commands.registerCommand('cSpellExt_<%= name %>.disableWorkspace', () => disable(false)),
    );
<% } %>

    // Register this extension's configuration with Code Spell Checker.
    const ext = await extension?.activate();
    await ext?.registerConfig(configLocation);
}

/**
 * Called by VS Code when the extension is unloaded.
 */
export function deactivate() {}
