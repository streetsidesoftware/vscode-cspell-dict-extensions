# Synced extensions

<!--
audience: developer
kind: reference
level: reads and writes the runtime, the scripts and the configs
-->

> [!NOTE]
> For developers changing extensions, the runtime or the sync.

Extensions with an `extension.config.json` are maintained centrally; the two without one, hunspell-syntax and timestamp-hover, are maintained by hand. To change a synced extension, edit its `extension.config.json` or the shared files, then run `npm run sync:extensions` and commit the result.

## What the sync maintains

The data is in `extension.config.json`, checked against [the schema](../static/extension.config.schema.json), which is generated from the `ExtensionConfig` type in [`src/config.ts`](../extension-runtime/src/config.ts). `npm run sync:extensions` writes:

- **Tool configs, overwritten:** `tsconfig.json`, `tsdown.config.ts`, `.vscode/*`, `.vscodeignore` and `.gitignore`, copied from [`template/`](../extension-runtime/template).
- **Generated into `static/`:** `static/cspell-ext.json`, which the extension registers with Code Spell Checker, `static/commands.json` and `static/dictionaries.json` (each dictionary with the locales or file types that turn it on, read from the installed dictionaries; not for a bundle). The minimum `engines` versions default to [`static/engines.json`](../static/engines.json). The sync puts the `engines` the imported dictionaries declare into `static/cspell-ext.json`, and `cspell.engines` in `extension.config.json` overrides them, as in cspell-dicts.
- **Derived:** the `name`, `displayName`, `description`, `type`, `engines.vscode`, `main`, `contributes.commands` and `scripts` fields of `package.json`, and the `devDependencies` entry `"@internal/extension-runtime": "file:../../extension-runtime"` (the other fields are kept), and the README sections between `@@inject` markers. Those are filled from shared templates in the root [`static/`](../static) (for example `requirements.md`, with `{@ engines.cspell @}` placeholders) and from the extension's `static/` data, using [inject-markdown](https://github.com/streetsidesoftware/inject-markdown):
  - `<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->`
  - `<!--- @@inject-table: ./static/commands.json --->`
  - `<!--- @@inject-table: ./static/dictionaries.json#markdown --->`
  - `<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->`, the Manual Settings of a language extension, filled from its `locale` and `friendlyName`. English variants use `manual-settings.english.md` instead, which advises replacing `en`.
- **Created when missing:** `cspell.config.yaml`, which imports `./static/cspell-ext.json` so the extension's dictionaries are available when you open its folder in VS Code. After that, the file belongs to the extension; add its `words`, `language` or other settings there.
- **Never touched:** the rest of the README, `samples/`, `CHANGELOG.md`, `LICENSE`, images, and an optional `src/custom.ts` for code only that extension needs.

The sync first regenerates the schema from the types and checks every `extension.config.json` against it. CI checks that the schema and the extensions are in sync.
