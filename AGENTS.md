# Agent Instructions

Guidance for AI coding agents (Claude Code, Copilot, and others) working in this repository. `CLAUDE.md` and `.github/copilot-instructions.md` point here.

This repo is **vscode-cspell-dict-extensions**: an npm + lerna-lite monorepo of VS Code extensions that add cspell dictionaries and parsers to [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker). Each extension in `extensions/` includes published `@cspell/dict-*` packages from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts) or `@cspell/parser-*` packages from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).

## Commands

A fresh clone has no `node_modules`. npm only: pnpm and yarn are blocked. Node.js version: `.tool-versions`.

```sh
npm ci                                # installs the root, then every package (the postinstall runs npm i in each)
npm run create:extension -- <name> --package <@cspell/package> --yes   # create an extension
npm run sync:extensions               # write the files the sync maintains, for every synced extension
npm run sync:extensions -- --check    # fail if a synced extension is out of date
npm run lint                          # cspell over the repo
npm run check-types                   # type-check test-runner, extension-runtime and the generator
npm run lint:code                     # oxlint, type-aware; warnings fail
npm run prettier:lint                 # Prettier check; prettier:fix writes
```

One extension, in `extensions/<name>/`:

```sh
npm run build          # tsdown, into out/
npm run test:cspell    # spell check samples/ with the extension's dictionaries
npm run test:vscode    # VS Code integration test; downloads VS Code into .vscode-test/ the first time
```

Tooling packages (`scripts/`, `extension-runtime/`, `generator-cspell-dicts-extensions/`) run `npm test` in their own directory.

Before finishing, run `npm run lint`, `npm run check-types`, `npm run lint:code` and `npm run sync:extensions -- --check` at the root, as CI does, plus `npm run build` and `npm run test:cspell` in each extension you changed.

## Where things are

Read the doc before changing that area. These are written for people too; [`CONTRIBUTING.md`](CONTRIBUTING.md) lists them.

- [`docs/guides/new-extension.md`](docs/guides/new-extension.md): creating an extension.
- [`docs/licenses.md`](docs/licenses.md): which license an extension can have.
- [`docs/synced-extensions.md`](docs/synced-extensions.md): how the extensions are maintained centrally, and the files the sync writes.
- [`docs/releasing.md`](docs/releasing.md): release-please, pre-release mode, runtime releases and publishing.
- [`docs/style.md`](docs/style.md): where docs go, and their audiences.
- [`generator-cspell-dicts-extensions/README.md`](generator-cspell-dicts-extensions/README.md): the generator's options.
- [`extension-runtime/README.md`](extension-runtime/README.md): the runtime's code.

## Rules

- **Synced extensions:** an extension with an `extension.config.json` is maintained centrally. Edit that file or the shared files in `extension-runtime/` and `static/`, then run `npm run sync:extensions` and commit the result. Never edit the files the sync writes; [What the sync maintains](docs/synced-extensions.md#what-the-sync-maintains) lists them. `hunspell-syntax` and `timestamp-hover` are maintained by hand.
- **New extensions:** create them with the generator, never by copying an extension, by following the `new-extension` skill: [`.claude/skills/new-extension/SKILL.md`](.claude/skills/new-extension/SKILL.md). A new dictionary is added to cspell-dicts first.
- **Words:** words a dictionary lacks belong upstream in cspell-dicts (see [Adding words](CONTRIBUTING.md#adding-words-to-a-language-dictionary)). A sample's names and other non-words go in its `samples/cspell.json`.
- **Generated after merge:** never edit or regenerate the root README lists, `static/generated/`, `static/dictionary-types.json`, `dict-extensions.code-workspace`, `release-please-config.json` or the extension lists in `.github/workflows/`. A workflow runs `gen:readme`, `gen:release-please` and `gen:workflow` after a PR merges.
- **Releases:** never edit `.release-please-manifest.json`; release-please adds new packages to it.
- **Licenses:** an extension includes its packages unchanged, and each keeps its own license; the extension's license covers its own code. A new extension gets `GPL-3.0-or-later` unless the user asks for another (`--license`).
- **Docs:** before editing a doc in `docs/` or `CONTRIBUTING.md`, read the audience header under its title and write for that reader. A new doc gets a header. See [Writing docs](docs/style.md).
- **Docs for people** never point to `AGENTS.md` or `CLAUDE.md`. If a guide needs something that's only here, move it into a doc under `docs/` and link to it from both.
- **Scripts:** write them in TypeScript (`.mts`, run directly by Node), not shell, `jq` or `.mjs`.

### Commits and pull requests

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/); release-please releases each extension from them.

- `feat:` and `fix:` release the extensions they touch: use them for what users get, such as `feat: add Thai extension`.
- Work on tooling, CI, docs or agent setup is `chore:`, `ci:` or `docs:`.
- After pushing more commits to an open PR, check that its description still matches.
