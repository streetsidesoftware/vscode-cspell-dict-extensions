# Extension tools

The tools that create and maintain the extensions in [`extensions/`](../extensions). They run directly with Node.js (type stripping), without a build step. The root npm scripts and a workflow run them:

- `npm run create:extension`: [`create.mts`](./create.mts), which creates an extension. See [Create an extension](#create-an-extension).
- `npm run sync:extensions`: [`sync.mts`](./sync.mts), which writes the files the sync maintains. See [Anatomy of an extension](../docs/extension-anatomy.md).
- `npm run tool:fix-extensions`: [`fix-extensions.mts`](./fix-extensions.mts), which gives every extension's `package.json` the fields the extensions share.
- `npm run list:packages`: [`list-packages.mts`](./list-packages.mts), which lists the published dictionaries and parsers.
- `npm run fetch:sample`: [`fetch-sample.mts`](./fetch-sample.mts), which fetches a sample text from Wikipedia.
- The `set-prerelease` workflow: [`set-prerelease-mode.mts`](./set-prerelease-mode.mts), which turns an extension's pre-release mode on or off. It uses only `node:` modules, because the workflow runs it before `npm ci`.

## API

The scripts outside this package import only [`api.mts`](./api.mts). The scripts that workflows run before `npm ci` import [`api-node-only.mts`](./api-node-only.mts) instead: it uses only `node:` modules. `api.mts` exports it too.

From [`extension-runtime/`](../extension-runtime), these tools import only its `api.ts`.

## Create an extension

Generate a VS Code extension for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker). An extension includes one or more published packages:

- **Dictionaries:** `@cspell/dict-*` packages from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts). A natural language is enabled by its locale. A word list's dictionaries are on for their file types, or off until turned on. The extension's commands turn them on and off.
- **Parsers:** `@cspell/parser-*` packages from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).

<!--- @@inject: ../docs/templates/package-must-be-published.md --->

The package must be published first. To create a dictionary, see [Creating a dictionary](https://github.com/streetsidesoftware/cspell-dicts/blob/main/docs/guides/new-dictionary.md) in cspell-dicts. To create a parser, see [Adding a parser package](https://github.com/streetsidesoftware/cspell-parsers/blob/main/docs/guides/new-parser-package.md) in cspell-parsers.

<!--- @@inject-end: ../docs/templates/package-must-be-published.md --->

### Usage

In the `vscode-cspell-dict-extensions` repository root directory:

```bash
npm run create:extension
```

The generator starts from the extension's name, e.g. `serbian`, and offers the packages that match it, from the lists cspell-dicts and cspell-parsers publish (`npm run list:packages` shows them), such as `@cspell/dict-sr-cyrl` and `@cspell/dict-sr-latn`; you can search with other words too. From the packages it suggests the kind and the locale. With several languages, as for Serbian, each also gets its own enable and disable commands. Each dictionary of a word list gets enable and disable commands. A dictionary can be off until a user turns it on, as in `@cspell/dict-vim`; then `samples/cspell.json` turns it on for the tests. The generator reads the installed packages to learn when each dictionary is on. It writes a README sentence that says when each dictionary is on. It also adds the words of the package and dictionary names that cspell doesn't know, such as `elisp`, to the extension's `cspell.config.yaml`.

It writes the files a person owns into `extensions/<name>` (the directory must not exist yet): `extension.config.json`, a starter `package.json`, `README.md`, `LICENSE` and a sample. Then it installs the packages and runs `npm run sync:extensions`, which writes the rest, as for every other extension.

The sample is what the tests spell check, and the VS Code test opens it. To bring your own, pass `--sample-file <file>`, once for each file: it is copied into `samples/` under its own name, and the VS Code test opens the first one. Use it for a word list's words, or for a parser's code, such as a file from the parser's `fixtures` in cspell-parsers.

Without `--sample-file`:

- **A language:** Wikipedia articles in that language, with their source and license, one file each, named after the title: `Seattle` is `samples/seattle.md`, and `Lingua Latina` is `samples/lingua-latina.md`. The generator asks for an article, with Seattle as the default, then for more until the answer is empty. `--sample-title <title>`, once for each article, names them instead; with `--yes` and no `--sample-title`, it's Seattle. A missing article is asked again, or with `--yes` stops the generator. Without Wikipedia, the generator stops before writing anything.
- **A word list or a parser:** there's no default. With `--yes`, `--sample-file` is required. Otherwise the generator asks for a sample file; without one, it writes `samples/sample.md`, a line to replace with a deliberate misspelling, so the spell check fails until you replace it.

Afterwards, list the sample's unknown words at its end. Put real words on a `cspell:words` comment line. Put names and other non-words on a `cspell:ignore` line. For a natural language, keep the `language` setting in `samples/cspell.json`. Then review the README, and run `npm run check:extension -- <name>`.

#### Without questions

Options answer the questions. Only the rest are asked. A few options, such as `--license`, set values the generator doesn't ask about.

With `--yes`, nothing is asked:

- The name and the packages are required.
- A word list or a parser needs `--sample-file`.
- A parser needs `--description`.
- The other values come from the packages, or have defaults.
- A missing value without a default is an error.

```bash
npm run create:extension -- swedish --package @cspell/dict-sv --yes
npm run create:extension -- serbian --package @cspell/dict-sr-cyrl --package @cspell/dict-sr-latn --yes
npm run create:extension -- french-reforme --package @cspell/dict-fr-reforme --friendly-name "French Réforme 90" --yes
npm run create:extension -- medical-terms --package @cspell/dict-medicalterms --sample-file terms.md --yes
npm run create:extension -- typescript-parser --package @cspell/parser-typescript --description "Tags the comments, strings and identifiers of TypeScript files." --sample-file sample.ts --yes
```

| Option                                | Answers                                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[name]`                              | The extension directory and command ID prefix, e.g. `swedish`. Required with `--yes`.                                                                 |
| `-p, --package <package>`             | A `@cspell/dict-*` or `@cspell/parser-*` package to include. Repeat it for several. Required with `--yes`.                                            |
| `--kind <language\|wordList\|parser>` | The kind of extension. Default: from the packages.                                                                                                    |
| `--locale <locale>`                   | A language's locale. Default: the most specific locale the packages share.                                                                            |
| `--native-name <name>`                | The language in the language itself. Default: the name `Intl` gives it; empty for none.                                                               |
| `--friendly-name <name>`              | The name shown in VS Code and the Marketplace. Default: from the name, e.g. `Swedish`.                                                                |
| `--display-name <name>`               | The Marketplace name. Default: `<friendly name> - Code Spell Checker`.                                                                                |
| `--description <text>`                | The Marketplace description. Required for a parser; the other kinds have a default.                                                                   |
| `--license <spdx>`                    | The extension's license. Default: `GPL-3.0-or-later`. For another license, add its text to `LICENSE`.                                                 |
| `--sample-title <title>`              | A Wikipedia article for a language's sample, in English or the language. Repeat it for several; the VS Code test opens the first. Default: `Seattle`. |
| `--sample-file <file>`                | A sample to copy into `samples/`. Repeat it for several; the VS Code test opens the first. Required with `--yes` for a word list or a parser.         |
| `-f, --force`                         | Replace the extension's directory when it exists.                                                                                                     |
| `-y, --yes`                           | Never ask.                                                                                                                                            |

## Development

`create` uses [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts) for the questions and [`commander`](https://www.npmjs.com/package/commander) for the command line.

- `create.mts` — the entry point.
- `src/create/app.mts` — the command line and the steps to generate an extension.
- `src/create/questions.mts` — the questions, their defaults, and `--yes`.
- `src/create/names.mts` — turns a typed name into a directory name, and suggests the friendly name.
- `src/create/locales.mts` — writes locales as BCP 47, and suggests a language's native and English names.
- `src/create/sample.mts` — chooses the samples: the files given, a language's Wikipedia article, or a starter file to replace.
- `src/create/writeExtension.mts` — writes `extension.config.json` and the starter files.
- `src/create/wordList.mts` — sets up a word list from its installed packages: the sample check, the commands, the README sentence and the words from the package names.
- `src/cspellPackages.mts`, `wikipedia.mts` and `existingExtensions.mts` — the package lists, the Wikipedia sample and the packages that already have an extension, shared with `npm run list:packages` and `fetch:sample`.
- `src/create/exec.mts` — runs npm through Node with npm's own `npm-cli.js`, without a shell, also on Windows.

```bash
npm test             # unit tests (node:test)
npm run check-types  # type check
```

## License

MIT © Street Side Software

<!--- cspell:ignore elisp --->
