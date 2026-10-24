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
	name: "macedonian",
	kind: "language",
	friendlyName: "Macedonian",
	displayName: "Macedonian - Code Spell Checker",
	description: "Adds Macedonian (македонски) spell checking to Code Spell Checker.",
	nativeName: "македонски",
	locale: "mk-Cyrl",
	sample: "samples/Skopje.md",
	cspell: { "import": ["@cspell/dict-mk/cspell-ext.json"] },
	commands: [
		{
			"id": "cSpellExt_macedonian.enable",
			"title": "Enable Macedonian Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "mk-Cyrl",
			"scope": "global"
		},
		{
			"id": "cSpellExt_macedonian.disable",
			"title": "Disable Macedonian Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "mk,mk-Cyrl",
			"scope": "global"
		},
		{
			"id": "cSpellExt_macedonian.enableWorkspace",
			"title": "Enable Macedonian Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "mk-Cyrl",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_macedonian.disableWorkspace",
			"title": "Disable Macedonian Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "mk,mk-Cyrl",
			"scope": "workspace"
		}
	]
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
