# VS Code Spelling Dictionary Extension Generator

Generate a VS Code extension for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker). An extension wraps one or more published packages:

- **Dictionaries:** `@cspell/dict-*` packages from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts). A natural language is enabled by its locale; a word list is on once installed.
- **Parsers:** `@cspell/parser-*` packages from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).

The packages must be published first. To add a new dictionary, add it to cspell-dicts.

## Usage

In the `vscode-cspell-dict-extensions` repository root directory:

```bash
npm run create:extension
```

The generator starts from the extension's name, i.e. `serbian`, and offers the packages that match it, such as `@cspell/dict-sr-cyrl` and `@cspell/dict-sr-latn`; you can search with other words too. From the packages it suggests the kind and the locale. With several languages, as for Serbian, each also gets its own enable and disable commands.

It writes the files a person owns into `extensions/<name>` (the directory must not exist yet): `extension.config.json`, a starter `package.json`, `README.md`, `LICENSE` and a sample. Then it installs the packages and runs `npm run sync:extensions`, which writes the rest, as for every other extension.

Afterwards, replace the text in `samples/seattle.md` and edit the README.

### Without questions

Options answer the questions; only the rest are asked. With `--yes` nothing is asked: the name and the packages are required, the other values come from the packages, and a missing value without a default is an error.

```bash
npm run create:extension -- swedish --package @cspell/dict-sv --yes
npm run create:extension -- serbian --package @cspell/dict-sr-cyrl --package @cspell/dict-sr-latn --yes
npm run create:extension -- french-reforme --package @cspell/dict-fr-reforme --friendly-name "French Réforme 90" --yes
npm run create:extension -- typescript-parser --package @cspell/parser-typescript --description "Spell checks TypeScript." --yes
```

| Option                                | Answers                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `[name]`                              | The extension directory and command ID prefix, i.e. `swedish`. Required with `--yes`.                   |
| `-p, --package <package>`             | A `@cspell/dict-*` or `@cspell/parser-*` package to wrap. Repeat it for several. Required with `--yes`. |
| `--kind <language\|wordList\|parser>` | The kind of extension. Default: from the packages.                                                      |
| `--locale <locale>`                   | A language's locale. Default: the most specific locale the packages share.                              |
| `--native-name <name>`                | The language in the language itself. Default: the name `Intl` gives it; empty for none.                 |
| `--friendly-name <name>`              | The name shown to people. Default: from the name, i.e. `Swedish`.                                       |
| `--display-name <name>`               | The Marketplace name. Default: `<friendly name> - Code Spell Checker`.                                  |
| `--description <text>`                | The Marketplace description. Required for a parser; the other kinds have a default.                     |
| `--license <spdx>`                    | The extension's license. Default: `GPL-3.0-or-later`. For another license, add its text to `LICENSE`.   |
| `-y, --yes`                           | Never ask.                                                                                              |

## Development

The generator is written in TypeScript and runs directly with Node.js (type stripping), without a build step. It uses [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts) for the questions and [`commander`](https://www.npmjs.com/package/commander) for the command line.

- `run.mts` — the entry point.
- `src/app.mts` — the command line and the steps to generate an extension.
- `src/questions.mts` — the questions, their defaults, and `--yes`.
- `src/npm.mts` — searches the npm registry for `@cspell/*` packages.
- `src/cspellExt.mts` — reads a dictionary's `cspell-ext.json` (from jsDelivr): natural language or not, and its locales.
- `src/names.mts` — turns a typed name into a directory name, and suggests the friendly name.
- `src/locales.mts` — writes locales as BCP 47, and suggests a language's native and English names.
- `src/writeExtension.mts` — writes `extension.config.json` and the starter files.
- `src/exec.mts` — runs npm through Node with npm's own `npm-cli.js`, without a shell, also on Windows.

```bash
npm test             # unit tests (node:test)
npm run check-types  # type check
```

## License

MIT © Street Side Software
