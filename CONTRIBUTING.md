# Contributing

<!--
audience: technical contributor, developer, maintainer
kind: index
level: any
-->

> [!NOTE]
> Where to start, for anyone who wants to change this repository.

Contributions are very welcome. The steps work on Windows (PowerShell), macOS and Linux.

<!--- @@inject: ./docs/templates/prerequisites.md#values-file=:./package.json --->

You need:

- [git](https://git-scm.com)
- [VS Code](https://code.visualstudio.com)
- [Node.js](https://nodejs.org) `>=24.11.0`

<!--- @@inject-end: ./docs/templates/prerequisites.md#values-file=:./package.json --->

## Docs

- [Creating an extension](./docs/guides/new-extension.md): a new extension for a published dictionary or parser.
- [Anatomy of an extension](./docs/extension-anatomy.md): which files an extension holds, and which are generated from shared code.
- [Releasing](./docs/releasing.md): release-please, pre-release mode and publishing. For maintainers.
- [Writing docs](./docs/style.md): where docs go, and who each one is for.

## Adding words to a language dictionary

This extension is based on [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts). Many languages have a file `dictionaries/*/src/*additional-words.txt` (example: [`en_shared`](https://github.com/streetsidesoftware/cspell-dicts/blob/main/dictionaries/en_shared/src/shared-additional-words.txt)) in which changes can be proposed through a GitHub PR. The next release of `cspell` should then contain your changes, and will be automatically bumped in the next release of this VS Code extension.

## Contributors

<a href="https://github.com/streetsidesoftware/cspell-dicts/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=streetsidesoftware/cspell-dicts&r="  width="800px"/>
</a>
