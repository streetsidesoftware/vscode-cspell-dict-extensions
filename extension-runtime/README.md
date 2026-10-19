# Extension runtime

The code, tool configs and data format shared by every extension in [`extensions/`](../extensions) that has an `extension.config.json`. An extension holds only its data and its own text; `npm run sync:extensions` writes the rest.

## Create an extension

1. **Find the package.** An extension wraps a published `@cspell/dict-*` package from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts#all-dictionaries) or a `@cspell/parser-*` package from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). A new dictionary is added to cspell-dicts first. Check its license (see [Licenses](../CONTRIBUTING.md#licenses)).

2. **Run the generator** in the repository root:

   ```sh
   npm run create:extension
   ```

   It asks for the extension's name, i.e. `swedish`, offers the packages that match it, and suggests the rest from the packages. With the name, the packages and `--yes`, it asks nothing: `npm run create:extension -- swedish --package @cspell/dict-sv --yes`. The [generator README](../generator-cspell-dicts-extensions/README.md) lists the options. It writes `extension.config.json` and the starter files into `extensions/<name>/`, installs the package and runs the sync.

3. **Replace the sample.** Put a text in the language in `samples/seattle.md`, such as the Wikipedia article about Seattle. `samples/cspell.json` turns the language on, and the tests check that the dictionary recognizes it. Add any words it doesn't know to `samples/cspell.json`.

4. **Edit `README.md`.** Change the text, and keep the `@@inject` markers: the sync fills those sections in.

5. **Build and test:**

   ```sh
   cd extensions/<name>
   npm run build
   npm test
   ```

6. **Try it** in VS Code (see [Testing Dictionary Extensions](../CONTRIBUTING.md#testing-dictionary-extensions)), then open a pull request. After it's merged, a workflow adds the extension to the workspace, the README lists, release-please and the publish workflows.

## What the sync maintains

The data is in `extension.config.json`, checked against [the schema](../static/extension.config.schema.json), which is generated from the `ExtensionConfig` type in [`src/config.ts`](./src/config.ts). `npm run sync:extensions` writes:

- **Tool configs, overwritten:** `tsconfig.json`, `tsdown.config.ts`, `.vscode/*`, `.vscodeignore` and `.gitignore`, copied from [`template/`](./template).
- **Generated into `static/`:** `static/cspell-ext.json`, which the extension registers with Code Spell Checker, `static/commands.json` and `static/dictionaries.json` (each dictionary with the locales or file types that turn it on, read from the installed dictionaries; not for a bundle). The minimum `engines` versions default to [`static/engines.json`](../static/engines.json). The sync puts the `engines` the imported dictionaries declare into `static/cspell-ext.json`, and `cspell.engines` in `extension.config.json` overrides them, as in cspell-dicts.
- **Derived:** the `name`, `displayName`, `description`, `type`, `engines.vscode`, `main`, `contributes.commands` and `scripts` fields of `package.json`, and the `devDependencies` entry `"@internal/extension-runtime": "file:../../extension-runtime"` (the other fields are kept), and the README sections between `@@inject` markers. Those are filled from shared templates in the root [`static/`](../static) (for example `requirements.md`, with `{@ engines.cspell @}` placeholders) and from the extension's `static/` data, using [inject-markdown](https://github.com/streetsidesoftware/inject-markdown):
  - `<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->`
  - `<!--- @@inject-table: ./static/commands.json --->`
  - `<!--- @@inject-table: ./static/dictionaries.json#markdown --->`
  - `<!--- @@inject: ../../static/manual-settings.language.md#values-file=:./extension.config.json --->`, the Manual Settings of a language extension, filled from its `locale` and `friendlyName`. English variants use `manual-settings.english.md` instead, which advises replacing `en`.
- **Created when missing:** `cspell.config.yaml`, which imports `./static/cspell-ext.json` so the extension's dictionaries are available when you open its folder in VS Code. After that, the file belongs to the extension; add its `words`, `language` or other settings there.
- **Never touched:** the rest of the README, `samples/`, `CHANGELOG.md`, `LICENSE`, images, and an optional `src/custom.ts` for code only that extension needs.

The sync first regenerates the schema from the types and checks every `extension.config.json` against it. CI checks that the schema and the extensions are in sync.

Each extension is bundled into one ESM file, `out/extension.js`, with [tsdown](https://tsdown.dev). The shared config in [`.config/tsdown.extension.config.mts`](../.config/tsdown.extension.config.mts) builds the entry [`src/entry.ts`](./src/entry.ts), with the extension's `extension.config.json` and `src/custom.ts` filled in.

## Releasing a runtime change

Every extension bundles the runtime, so a change to it reaches people only when the extensions are released. The runtime is a release-please package, and each extension lists it in `devDependencies`. A `fix:` or `feat:` commit that changes `extension-runtime/` releases the runtime, and release-please's `node-workspace` plugin then releases every extension with it. A `chore:` commit releases nothing.
