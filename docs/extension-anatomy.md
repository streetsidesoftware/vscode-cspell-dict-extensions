# Anatomy of an extension

<!--
audience: developer
kind: reference
level: reads and writes the runtime, the scripts and the configs
-->

> [!NOTE]
> For developers changing an extension, the shared runtime or the templates.

An extension holds only its data, its README text and its samples. The rest is generated from shared code and templates, so a change in one place reaches every extension.

To change an extension, edit its `extension.config.json`, or the shared files in `extension-runtime/` and `static/`. Then run `npm run sync:extensions` and commit the result. On every pull request, a workflow runs the sync and pushes any change. `npm run check:extensions` fails when an extension is out of date.

## Files you edit

- `extension.config.json`: the extension's data. It's checked against [the schema](../extension-runtime/extension.config.schema.json), which the runtime's build generates from the `ExtensionConfig` type in [`src/config.ts`](../extension-runtime/src/config.ts).
- `README.md`, except the sections between `@@inject` markers.
- `samples/` and `images/`.
- `LICENSE`: the license of the extension's own code, `GPL-3.0-or-later` unless the generator's `--license` set another. The extension includes its dictionaries or parsers unchanged, and each keeps its own license in its package.
- `cspell.config.yaml`. The sync creates it when it's missing, importing `./static/cspell-ext.json`, so the extension's dictionaries work when you open its folder. After that, it's yours: add `words`, `language` or other settings there.
- `src/custom.ts`, optional: code only this extension needs.
- The other fields of `package.json`, such as `dependencies`.

release-please writes `CHANGELOG.md` and the `version` in `package.json`. The generator creates `CHANGELOG.md` empty: release-please keeps any text it finds before the first version heading.

## Files the sync writes

Don't edit these; `npm run sync:extensions` overwrites them.

- **Tool configs:** `tsdown.config.ts`, `.vscode/*` and `.gitignore`, copied from [`templates/sync/`](../extension-tools/templates/sync). Also `tsconfig.json`, but only when the extension has a `src/custom.ts`; otherwise the sync removes it.
- **`static/cspell-ext.json`:** the `cspell` settings from `extension.config.json`, which the extension registers with Code Spell Checker.
- **`static/commands.json`:** the commands, for the README's table. Removed when there are none.
- **`static/dictionaries.json`:** for the README's table, one row for each dictionary a setting names, with the setting's `locale`, `languageId` and `glob` as written. The settings are the top-level `dictionaries`, the language settings and the overrides, read from the installed dictionaries and the extension's `cspell`. Removed when there are none, and never written for a bundle.
- **`package.json` fields:** `name`, `displayName`, `description`, `type`, `engines.vscode` (copied from [`extension-runtime/package.json`](../extension-runtime/package.json)), `main`, `files`, `contributes.commands` and `scripts`.
- **`package.json` `files`:** what vsce packages, besides `package.json` and `README.md`. It lists `LICENSE`, `CHANGELOG.md`, `extension.js`, the `icon`, `static/cspell-ext.json` and `node_modules/**`. It also lists `COPYING` when the extension has one. vsce only takes the production dependencies from `node_modules`. The sync removes `.vscodeignore`, because vsce refuses an extension that has both.
- **README sections** between `@@inject` markers, filled by [inject-markdown](https://github.com/streetsidesoftware/inject-markdown) from the shared templates in [`static/`](../static) and the extension's own `static/` files:
  - `<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->`
  - `<!--- @@inject-table: ./static/commands.json --->`
  - `<!--- @@inject-table: ./static/dictionaries.json#markdown --->`
  - `<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->`, the Manual Settings of a language extension, filled from its `locale` and `friendlyName`. English variants use `manual-settings.english.md` instead, which advises replacing `en`.

The sync also sets the `package.json` fields every extension shares: `private`, `repository`, `publisher`, `author`, `bugs`, `engines.vscode` and the `vsce` base URLs. It keeps every other value, and sorts the fields.

The sync checks every `extension.config.json` against the runtime's schema first.

## Checks

`npm run check:extensions` changes nothing. It fails when the sync would change a file, and when a config says something the installed packages no longer back up:

- A command turns a dictionary on or off that no package defines.
- A command, or `locale`, names a locale no package declares. Locales compare as in cspell: `sv_SE` is `sv-SE`.

`npm run check:extension -- <folder>` runs it for one extension, along with the build, the tests, Prettier and the spell check.

The sync stops with an error on a dictionary setting that the README's table would show wrongly:

- A `!name`, which turns a dictionary off.
- A language setting with `local`.
- An override that names dictionaries and sets `language` or `languageId`. These set the locale and file type of the files it matches. They don't select the files.
- A package that imports other packages.

## The built file

`extension.js` is the extension's code: the runtime, bundled by `npm run build` with the extension's `extension.config.json`. It's committed, so a change that alters it releases the extension. On every pull request, a workflow rebuilds it and pushes any change. Don't edit it.

## Engines

`static/cspell-ext.json` gets the `engines` the imported dictionaries declare. `cspell.engines` in `extension.config.json` overrides them. The README's Requirements table shows these versions, and falls back to [`static/engines.json`](../static/engines.json) for an engine neither one sets.

## Extensions made by hand

`hunspell-syntax` and `timestamp-hover` have no `extension.config.json`. The sync gives them only the shared `package.json` fields.
