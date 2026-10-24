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
	name: "french-reforme",
	kind: "language",
	friendlyName: "French Réforme 90",
	displayName: "French Réforme 90 - Code Spell Checker",
	description: "Adds French Réforme 90 (français) spell checking to Code Spell Checker.",
	nativeName: "français",
	locale: "fr-90",
	sample: "samples/seattle.md",
	cspell: { "import": ["@cspell/dict-fr-reforme/cspell-ext.json"] },
	commands: [
		{
			"id": "cSpellExt_french-reforme.enable",
			"title": "Enable French Réforme 90 Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "global"
		},
		{
			"id": "cSpellExt_french-reforme.disable",
			"title": "Disable French Réforme 90 Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "global"
		},
		{
			"id": "cSpellExt_french-reforme.enableWorkspace",
			"title": "Enable French Réforme 90 Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_french-reforme.disableWorkspace",
			"title": "Disable French Réforme 90 Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "workspace"
		},
		{
			"id": "cSpellExt_french-reforme.enableFrench",
			"title": "Enable French Réforme 90 Spell Checker Dictionary",
			"action": "enable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_french-reforme.disableFrench",
			"title": "Disable French Réforme 90 Spell Checker Dictionary",
			"action": "disable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "global",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_french-reforme.enableFrenchWorkspace",
			"title": "Enable French Réforme 90 Spell Checker Dictionary in Workspace",
			"action": "enable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		},
		{
			"id": "cSpellExt_french-reforme.disableFrenchWorkspace",
			"title": "Disable French Réforme 90 Spell Checker Dictionary in Workspace",
			"action": "disable",
			"toggle": "locale",
			"value": "fr-90",
			"scope": "workspace",
			"contributes": false,
			"legacy": true,
			"notes": "Original command ID, kept registered so existing keybindings and tasks keep working."
		}
	],
	notes: "`locale` is `fr-90`, not a BCP 47 tag: the IANA registry has no variant for the 1990 French spelling reform, and `fr-90` is the locale cspell's French Réforme dictionary declares. Enable uses `fr-90` because it is the only locale exclusive to this dictionary: `fr` and `fr-FR` also turn on French. Disable removes only `fr-90`, not `fr`: `fr` is shared with French, so a user who added `fr` keeps this dictionary on."
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
