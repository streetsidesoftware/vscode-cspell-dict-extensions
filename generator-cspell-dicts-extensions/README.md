# VS Code Spelling Dictionary Extension Generator

Generate a VS Code extension for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker):

- **Dictionary:** wraps a `@cspell/dict-*` package from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts).
- **Parser:** wraps a `@cspell/parser-*` package from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).
- **Scaffold:** the extension without a package, with enable / disable commands to fill in.

## Usage

In the `vscode-cspell-dict-extensions` repository root directory:

```bash
npm run create:extension
```

The generator asks which kind of extension to create, searches npm for the package, and suggests the rest from the package. It writes the extension into `extensions/<name>` (the directory must not exist yet), installs the package, and formats the files with prettier.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for a description of each question.

### Without questions

Options answer the questions; only the rest are asked. With `--yes` nothing is asked: the suggested answers are used, and a missing value without a default is an error.

```bash
npm run create:extension -- @cspell/dict-sv --yes
npm run create:extension -- @cspell/dict-fr-reforme --name french-reforme --locale fr-90 --yes
npm run create:extension -- @cspell/parser-typescript --yes
npm run create:extension -- --kind scaffold --toggle dictionary --name my-words --yes
```

| Option                                              | Answers                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `[package]`                                         | The `@cspell/dict-*` or `@cspell/parser-*` package. It implies the kind.                    |
| `--kind <dictionary\|parser\|scaffold>`             | The kind of extension. Only needed for a scaffold.                                          |
| `--natural-language`, `--no-natural-language`       | Whether a dictionary is enabled by locale or by name. Detected from the package's config.   |
| `--locale <locale>`                                 | The locale to toggle. Defaults to the package's most specific locale.                       |
| `--toggle <locale\|dictionary\|file-type>`          | What a scaffold's commands toggle.                                                          |
| `--name <name>`                                     | The extension directory and command ID prefix. Defaults to a name derived from the package. |
| `--friendly-name <name>`                            | The name shown to people.                                                                   |
| `--display-name`, `--description`, `--command-name` | Override the values derived from the friendly name.                                         |
| `-y, --yes`                                         | Never ask.                                                                                  |

## Development

The generator is written in TypeScript and runs directly with Node.js (type stripping), without a build step. It uses [`@inquirer/prompts`](https://www.npmjs.com/package/@inquirer/prompts) for the questions and [`commander`](https://www.npmjs.com/package/commander) for the command line.

- `run.mts` — the entry point.
- `src/app.mts` — the command line and the steps to generate an extension.
- `src/questions.mts` — the questions, their defaults, and `--yes`.
- `src/npm.mts` — searches the npm registry for `@cspell/*` packages.
- `src/cspellExt.mts` — reads a dictionary's `cspell-ext.json` (from jsDelivr): natural language or not, its locales and dictionary names.
- `src/names.mts` — derives the extension name.
- `src/writeExtension.mts` — renders and copies the files in `templates/`.
- `src/exec.mts` — runs npm and npx, also on Windows.
- `src/render.mts` — renders the template syntax: `<%= value %>` inserts a value (HTML escaped), `<%- value %>` inserts it as is, and `<% if (value) { %> … <% } else { %> … <% } %>` includes text conditionally. A line holding only an `if`, `else` or end tag is removed.

```bash
npm test             # unit tests (node:test)
npm run check-types  # type check
```

After changing a template, update the test snapshots with:

```bash
node --test --test-update-snapshots "src/**/*.test.mts"
```

## License

MIT © Street Side Software
