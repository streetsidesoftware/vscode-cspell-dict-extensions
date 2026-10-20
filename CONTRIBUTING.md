# Contributing

<!--
audience: technical contributor, developer, maintainer
kind: index
level: any
-->

> [!NOTE]
> Where to start, for anyone who wants to change this repository.

This repository holds the VS Code extensions that add cspell dictionaries and parsers to [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker). Each extension includes a published package from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts) or [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).

## Adding words to a language dictionary

The words come from cspell-dicts, not from this repository. To add or fix a word, change it in cspell-dicts. Its [contributing guide](https://github.com/streetsidesoftware/cspell-dicts/blob/main/CONTRIBUTING.md) shows how, in your browser or in a clone.

After cspell-dicts publishes the dictionary, a daily workflow here updates the extensions that include it. Their next release has your change.

## Changing this repository

Contributions are very welcome. The steps work on Windows (PowerShell), macOS and Linux.

<!--- @@inject: ./docs/templates/prerequisites.md#values-file=:./package.json --->

You need:

- [git](https://git-scm.com)
- [VS Code](https://code.visualstudio.com)
- [Node.js](https://nodejs.org) `>=24.11.0`

<!--- @@inject-end: ./docs/templates/prerequisites.md#values-file=:./package.json --->

### Docs

- [Creating an extension](./docs/guides/new-extension.md): a new extension for a published dictionary or parser.
- [Anatomy of an extension](./docs/extension-anatomy.md): which files an extension holds, and which are generated from shared code.
- [Releasing](./docs/releasing.md): release-please, pre-release mode and publishing. For maintainers.
- [Writing docs](./docs/style.md): where docs go, and who each one is for.

## Contributors

<a href="https://github.com/streetsidesoftware/vscode-cspell-dict-extensions/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=streetsidesoftware/vscode-cspell-dict-extensions&r="  width="800px"/>
</a>
