// Built from extension-runtime/ by tsdown. Do not edit.
import * as vscode from "vscode";
//#region \0rolldown/runtime.js
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
//#endregion
//#region extension.config.json
var extension_config_default = {
	$schema: "../../extension-runtime/extension.config.schema.json",
	name: "swedish",
	kind: "language",
	friendlyName: "Swedish",
	displayName: "Swedish - Code Spell Checker",
	description: "Adds Swedish (svenska) spell checking to Code Spell Checker.",
	nativeName: "svenska",
	locale: "sv-SE",
	sample: "samples/Seattle.md",
	cspell: { "import": ["@cspell/dict-sv/cspell-ext.json"] },
	commands: [
		{
			"id": "cSpellExt_swedish.enable",
			"title": "Enable Swedish Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "sv_SE",
			"scope": "global"
		},
		{
			"id": "cSpellExt_swedish.disable",
			"title": "Disable Swedish Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "sv-SE,sv",
			"scope": "global"
		},
		{
			"id": "cSpellExt_swedish.enableWorkspace",
			"title": "Enable Swedish Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "sv_SE",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_swedish.disableWorkspace",
			"title": "Disable Swedish Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "sv-SE,sv",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_swedish.enableSwedish",
			"title": "Enable Swedish Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "sv_SE",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_swedish.disableSwedish",
			"title": "Disable Swedish Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "sv-SE,sv",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_swedish.enableSwedishWorkspace",
			"title": "Enable Swedish Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "sv_SE",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_swedish.disableSwedishWorkspace",
			"title": "Disable Swedish Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "sv-SE,sv",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		}
	]
};
//#endregion
//#region ../../extension-runtime/src/noCustom.ts
var noCustom_exports = /* @__PURE__ */ __exportAll({ activate: () => void 0 });
//#endregion
//#region ../../extension-runtime/src/config.ts
const cspellExtPath = "static/cspell-ext.json";
//#endregion
//#region ../../extension-runtime/src/activate.ts
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
	const api = getApi(extension);
	for (const command of config.commands) context.subscriptions.push(vscode.commands.registerCommand(command.id, () => runCommand(command, extension)));
	const registered = api.then((cspell) => cspell?.registerConfig(context.asAbsolutePath(cspellExtPath)));
	return Promise.all([registered, custom?.activate?.(context, api)]).then(() => void 0);
}
function getApi(extension) {
	return Promise.resolve(extension?.activate());
}
function runCommand(command, extension) {
	const enable = command.action === "enable";
	switch (command.toggle) {
		case "locale": {
			const isGlobal = command.scope === "global";
			return getApi(extension).then((api) => enable ? api?.enableLocale(isGlobal, command.value) : api?.disableLocale(isGlobal, command.value));
		}
		case "fileType": return getApi(extension).then((api) => enable ? api?.enableLanguageId(command.value) : api?.disableLanguageId(command.value));
		case "dictionary": {
			const isGlobal = command.scope === "global";
			return toggleDictionary(command.value, enable, isGlobal);
		}
	}
}
/**
* Add `name` or `!name` to `cSpell.dictionaries`. Code Spell Checker has no API for this yet
* (streetsidesoftware/vscode-spell-checker#5585).
*/
function toggleDictionary(name, enable, isGlobal) {
	const settings = vscode.workspace.getConfiguration("cSpell");
	const inspected = settings.inspect("dictionaries");
	const dictionaries = ((isGlobal ? inspected?.globalValue : inspected?.workspaceValue) ?? []).filter((d) => d !== name && d !== `!${name}`);
	dictionaries.push(enable ? name : `!${name}`);
	const target = isGlobal ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace;
	return Promise.resolve(settings.update("dictionaries", dictionaries, target));
}
//#endregion
//#region ../../extension-runtime/src/entry.ts
function activate(context) {
	return activateExtension(context, extension_config_default, noCustom_exports);
}
function deactivate() {}
//#endregion
export { activate, deactivate };
