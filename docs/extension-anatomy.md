# Anatomy of an extension

<!--
audience: developer
kind: reference
level: reads and writes the runtime, the scripts and the configs
-->

> [!NOTE]
> For developers changing an extension, the shared runtime or the templates.

An extension holds only its data, its README text and its samples. The rest is generated from shared code and templates, so a change in one place reaches every extension.

To change an extension, edit its `extension.config.json`, or the shared files in `extension-runtime/` and `static/`. Then run `npm run sync:extensions` and commit the result. CI fails when an extension is out of date.

## Files you edit

- `extension.config.json`: the extension's data. It's checked against [the schema](../static/extension.config.schema.json), which is generated from the `ExtensionConfig` type in [`src/config.ts`](../extension-runtime/src/config.ts).
- `README.md`, except the sections between `@@inject` markers.
- `samples/`, `LICENSE` and `images/`.
- `cspell.config.yaml`. The sync creates it when it's missing, importing `./static/cspell-ext.json`, so the extension's dictionaries work when you open its folder. After that, it's yours: add `words`, `language` or other settings there.
- `src/custom.ts`, optional: code only this extension needs.
- The other fields of `package.json`, such as `dependencies`.

release-please writes `CHANGELOG.md` and the `version` in `package.json`.

## Files the sync writes

Don't edit these; `npm run sync:extensions` overwrites them.

- **Tool configs:** `tsdown.config.ts`, `.vscode/*`, `.vscodeignore` and `.gitignore`, copied from [`template/`](../extension-runtime/template). Also `tsconfig.json`, but only when the extension has a `src/custom.ts`; otherwise the sync removes it.
- **`static/cspell-ext.json`:** the `cspell` settings from `extension.config.json`, which the extension registers with Code Spell Checker.
- **`static/commands.json`:** the commands, for the README's table. Removed when there are none.
- **`static/dictionaries.json`:** each dictionary with the locales or file types that turn it on, read from the installed dictionaries, for the README's table. For a word list, a dictionary that nothing turns on is listed as "off until turned on". Removed when there are none, and never written for a bundle.
- **`package.json` fields:** `name`, `displayName`, `description`, `type`, `engines.vscode`, `main`, `contributes.commands`, `scripts`, and the `devDependencies` entry `"@internal/extension-runtime": "file:../../extension-runtime"`.
- **README sections** between `@@inject` markers, filled by [inject-markdown](https://github.com/streetsidesoftware/inject-markdown) from the shared templates in [`static/`](../static) and the extension's own `static/` files:
  - `<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->`
  - `<!--- @@inject-table: ./static/commands.json --->`
  - `<!--- @@inject-table: ./static/dictionaries.json#markdown --->`
  - `<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->`, the Manual Settings of a language extension, filled from its `locale` and `friendlyName`. English variants use `manual-settings.english.md` instead, which advises replacing `en`.

`npm run tool:fix-extensions`, which the generator runs, also sets the `package.json` fields every extension shares: `private`, `repository`, `publisher`, `author`, `bugs`, and the `vsce` base URLs.

The sync also regenerates the schema from the `ExtensionConfig` type first, and checks every `extension.config.json` against it.

## Engines

`static/cspell-ext.json` gets the `engines` the imported dictionaries declare. `cspell.engines` in `extension.config.json` overrides them. The README's Requirements table shows these versions, and falls back to [`static/engines.json`](../static/engines.json) for an engine neither one sets.

## Extensions made by hand

`hunspell-syntax` and `timestamp-hover` have no `extension.config.json`. The sync skips them.
