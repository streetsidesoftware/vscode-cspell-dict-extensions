# Contributing

Contributions are very welcome.

Same steps works on Windows (powershell) and Linux. Just needs Node.js installed.

## How to create a new extension

Please fork this repository to add new dictionaries.

#### Running the generator

In the `vscode-cspell-dict-extensions` repository root directory

```sh
npm run create:extension
```

The generator asks which kind of extension to create, then helps you find the package on npm. Press enter to accept a suggested answer.

| Question           | Description                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kind**           | `Dictionary` for a `@cspell/dict-*` package from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts), `Parser` for a `@cspell/parser-*` package from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers), or `Scaffold` for an extension without a package. A dictionary or parser that isn't published yet must be added to its repository first. |
| **Package**        | Type a language or topic, i.e. `swedish`, and pick the package. Packages that already have an extension are marked.                                                                                                                                                                                                                                                                  |
| Natural language   | Dictionaries only. Suggested from the package: a natural language, like Swedish, is enabled by locale; a word list, like `medical terms`, is enabled by name.                                                                                                                                                                                                                        |
| Locale             | Natural languages only. The locale the enable / disable commands toggle. The most specific one, i.e. `fr-90` rather than `fr`, avoids also enabling other dictionaries for the language.                                                                                                                                                                                             |
| Toggle             | Scaffolds only. What the enable / disable commands toggle: a locale, dictionaries or file types. The value is filled in later.                                                                                                                                                                                                                                                       |
| **Extension name** | The directory in `extensions/` and the command ID prefix, i.e. `swedish`. Suggested from the package. The directory must not exist yet.                                                                                                                                                                                                                                              |
| Friendly name      | The name shown to people, i.e. `Swedish`. It is used for the display name (`Swedish - Code Spell Checker`), the description, and the command titles.                                                                                                                                                                                                                                 |

A parser extension has no enable / disable commands: disable the extension in VS Code to turn the parser off.

##### Without questions

Pass the package and `--yes` to use the suggested answers:

```sh
npm run create:extension -- @cspell/dict-sv --yes
```

With `--yes` the generator never asks; it stops with an error when a value has no default, i.e. `--name` for a scaffold. Run `npm run create:extension -- --help` for all options.

After all the information is entered, the extension should be generated.

Please fix any errors and make sure the following two commands run:

```sh
cd extensions/<language>
npm ci
npm run build
```

Please update files:

- `README.md`

  - Add yourself as contributor under `## Contributors` header

    ```txt
    _Language_ - [Username](https://github.com/Username)
    ```

- `extensions/<language>/samples/seattle.md`
  - Go to Seattle wikipedia page translated to your language and copy some content to `seattle.md`. It's later used to test if plugin recognizes words

Please update files if necessary (leave it as unless you know why you're changing it):

- `extensions/<language>/README.md`
- `extensions/<language>/package.json`
- `extensions/<language>/LICENSE`

There are other `.json` and `README` files where new extension is referenced but those are automatically generated after pull request so don't edit any other files.

## Licenses

Note: the preferred licenses are either MIT or GPL3.

The safest to use is GPL3, but it is the most sticky.

Since these extensions bundle the dictionary as part of the extension (falls under static linking clauses), the license must match the bundled dictionary / dictionaries.
If the bundled dictionary is GPL3, then the extension must be GPL3 or later.

## Testing Dictionary Extensions

### Open extension folder in VSCode

```sh
cd extensions/<language> # Might be already done in in previous step
code . # Opens vscode in current directory
```

### Run/Debug extension

Within VS Code `Debug -> Start Debugging` with the `Launch Extension` configuration.

![Debug extension](./images/debug-extension.png)

This will open new VSCode window. Inside it open previously edited `seattle.md`. If most words of your language are now recognized (no blue squiggly line) you can open pull request to `main` branch. Build files are already in .gitignore so you can commit all changes.

Shortly after pull request is merged extension will appear in vscode extensions marketplace.

## Adding words to a language dictionary

This extension is based on [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts). Many languages have a file `dictionaries/*/src/*additional-words.txt` (example: [`en_shared`](https://github.com/streetsidesoftware/cspell-dicts/blob/main/dictionaries/en_shared/src/shared-additional-words.txt)) in which changes can be proposed through a GitHub PR. The next release of `cspell` should then contain your changes, and will be automatically bumped in the next release of this VS Code extension.

## Contributors

<a href="https://github.com/streetsidesoftware/cspell-dicts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=streetsidesoftware/cspell-dicts&r="  width="800px"/>
</a>
