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
	name: "scientific-terms",
	kind: "wordList",
	friendlyName: "Scientific Terms",
	displayName: "Scientific Terms - Code Spell Checker",
	description: "Adds the Scientific Terms dictionary to Code Spell Checker.",
	sample: "samples/README.md",
	cspell: {
		"dictionaries": ["scientific-terms-us"],
		"import": ["@cspell/dict-scientific-terms-us/cspell-ext.json"]
	},
	commands: [
		{
			"id": "cSpellExt_scientific-terms.enableScientificTermsUs",
			"title": "Enable Scientific Terms Spell Checker Dictionary",
			"action": "enable",
			"toggle": "dictionary",
			"value": "scientific-terms-us",
			"scope": "global"
		},
		{
			"id": "cSpellExt_scientific-terms.disableScientificTermsUs",
			"title": "Disable Scientific Terms Spell Checker Dictionary",
			"action": "disable",
			"toggle": "dictionary",
			"value": "scientific-terms-us",
			"scope": "global"
		},
		{
			"id": "cSpellExt_scientific-terms.enableScientificTermsUsWorkspace",
			"title": "Enable Scientific Terms Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "dictionary",
			"value": "scientific-terms-us",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_scientific-terms.disableScientificTermsUsWorkspace",
			"title": "Disable Scientific Terms Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "dictionary",
			"value": "scientific-terms-us",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_scientific-terms.enableMathematicsTermsUs",
			"title": "Enable Mathematics Terms Spell Checker Dictionary",
			"action": "enable",
			"toggle": "dictionary",
			"value": "mathematics-terms-us",
			"scope": "global"
		},
		{
			"id": "cSpellExt_scientific-terms.disableMathematicsTermsUs",
			"title": "Disable Mathematics Terms Spell Checker Dictionary",
			"action": "disable",
			"toggle": "dictionary",
			"value": "mathematics-terms-us",
			"scope": "global"
		},
		{
			"id": "cSpellExt_scientific-terms.enableMathematicsTermsUsWorkspace",
			"title": "Enable Mathematics Terms Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "dictionary",
			"value": "mathematics-terms-us",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_scientific-terms.disableMathematicsTermsUsWorkspace",
			"title": "Disable Mathematics Terms Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "dictionary",
			"value": "mathematics-terms-us",
			"scope": "workspace"
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
