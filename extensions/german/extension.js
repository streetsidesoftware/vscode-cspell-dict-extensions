// Built from extension-runtime/ by tsdown. Do not edit.
import * as vscode from "vscode";
// \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
// extension.config.json
var extension_config_default = {
	$schema: "../../extension-runtime/extension.config.schema.json",
	name: "german",
	kind: "language",
	friendlyName: "German",
	displayName: "German - Code Spell Checker",
	description: "Adds German (Deutsch) spell checking to Code Spell Checker.",
	nativeName: "Deutsch",
	locale: "de-DE",
	sample: "samples/seattle.md",
	cspell: { "import": ["@cspell/dict-de-de/cspell-ext.json"] },
	commands: [
		{
			"id": "cSpellExt_german.enable",
			"title": "Enable German Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "global"
		},
		{
			"id": "cSpellExt_german.disable",
			"title": "Disable German Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "global"
		},
		{
			"id": "cSpellExt_german.enableWorkspace",
			"title": "Enable German Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_german.disableWorkspace",
			"title": "Disable German Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_german.enableGerman",
			"title": "Enable German Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_german.disableGerman",
			"title": "Disable German Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_german.enableGermanWorkspace",
			"title": "Enable German Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_german.disableGermanWorkspace",
			"title": "Disable German Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "de-DE",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		}
	],
	notes: "Disable removes only `de-DE`, not `de`: `de` is shared with Austrian and Swiss German, so a user who added `de` keeps this dictionary on."
};
// ../../extension-runtime/src/noCustom.ts
var noCustom_exports = /* @__PURE__ */ __exportAll({ activate: () => void 0 });
// ../../extension-runtime/src/config.ts
const cspellExtPath = "static/cspell-ext.json";
// ../../extension-runtime/src/activate.ts
const codeSpellCheckerId = "streetsidesoftware.code-spell-checker";
/**
* Activate an extension from its `extension.config.json`: register its commands and its `static/cspell-ext.json`.
*
* Not an `async` function: the commands must be registered before `activate` returns, and the rest is a
* promise chain.
* @param config - the content of `extension.config.json`, already checked against the schema.
* @param custom - the extension's `src/custom.ts`, if it has one.
*/
function activateExtension(context, config, custom) {
	const extension = vscode.extensions.getExtension(codeSpellCheckerId);
	const api = Promise.resolve(extension?.activate());
	for (const command of config.commands) context.subscriptions.push(vscode.commands.registerCommand(command.id, commandHandler(command, api)));
	const registered = api.then((cspell) => cspell?.registerConfig(context.asAbsolutePath(cspellExtPath)));
	return Promise.all([registered, custom?.activate?.(context, api)]).then(() => void 0);
}
/**
* The handler of one command, with its action, toggle, value and scope resolved once.
* @param api - Code Spell Checker's API, once it's active.
*/
function commandHandler(command, api) {
	const { value } = command;
	const isGlobal = command.scope === "global";
	const enable = command.action === "enable";
	if (command.toggle === "dictionary") return () => toggleDictionary(value, enable, isGlobal);
	return enable ? () => api.then((cspell) => cspell?.enableLocale(isGlobal, value)) : () => api.then((cspell) => cspell?.disableLocale(isGlobal, value));
}
/**
* Add `name` or `!name` to `cSpell.dictionaries`. Code Spell Checker has no API for this yet
* (streetsidesoftware/vscode-spell-checker#5585).
*/
function toggleDictionary(name, enable, isGlobal) {
	const settings = vscode.workspace.getConfiguration("cSpell");
	const inspected = settings.inspect("dictionaries");
	const current = (isGlobal ? inspected?.globalValue : inspected?.workspaceValue) ?? [];
	const negated = `!${name}`;
	const dictionaries = current.filter((d) => d !== name && d !== negated);
	dictionaries.push(enable ? name : negated);
	const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
	return Promise.resolve(settings.update("dictionaries", dictionaries, target));
}
// ../../extension-runtime/src/entry.ts
function activate(context) {
	return activateExtension(context, extension_config_default, noCustom_exports);
}
function deactivate() {}
export { activate, deactivate };
