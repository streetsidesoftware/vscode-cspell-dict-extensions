---
name: new-extension
description: 'Creates a new extension in this repo, from request to one pull request: finds the published @cspell/dict-* or @cspell/parser-* package, runs the generator, gets the sample and the checks passing, and opens the PR. Use when asked to add or create an extension for a language, word list, dictionary or parser, such as "add an extension for Thai".'
---

# new-extension

Takes a request such as "add an extension for Thai" to one pull request. The steps for people are in
`docs/guides/new-extension.md`, and the generator's options in `generator-cspell-dicts-extensions/README.md`; read
both first. This skill runs the generator without questions (`--yes`) and adds the points where you stop and ask the
user.

## Workflow

### 1. Install

- **Do,** in the repository root:

  ```sh
  npm ci
  ```

### 2. Find the package

An extension includes a published package, unchanged. Find the one the request means.

- **Do:** search one word at a time (several words match nothing): the English name, the language's own name, its
  language code, or the topic.

  ```sh
  npm run list:packages -- <word>
  ```

- **Stop and ask** when:
  - **Nothing matches.** The package must be published first, in
    [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts) or
    [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). Say so, and stop.
  - **The request is ambiguous.** "Gaelic" could mean Scottish Gaelic (`@cspell/dict-gd`) or Irish (no package);
    "Portuguese" could mean Portugal or Brazil. List the matches and ask which.
  - **The Extension column says "ships with cspell".** cspell already includes it, so it needs no extension. Say so,
    and stop.
  - **The Extension column names an extension.** Show it, and ask whether to change that extension instead or create
    another one; both are allowed.
- **Done when** the user's request names exactly one set of packages, or the user has chosen.

### 3. Branch

- **Do:** work on a new branch `new-extension/<name>` from up-to-date `origin/main`, or on the fresh branch you're
  already on for this task.

### 4. Gather the answers

`--yes` never prompts, so every value without a default must be an option. Defaults come from the packages; the
generator README lists them.

- **Name:** a short lowercase English name, such as `thai` or `scottish-gaelic`. It's the folder `extensions/<name>/`,
  the package `code-spell-checker-<name>` and the commands' ID prefix, so it can't change after release. Ask when the request doesn't make it obvious.
- **Sample:**
  - **A language:** the generator fetches the Wikipedia article about Seattle in that language. If that language's
    Wikipedia has none, the generator stops: ask the user for another article, and pass `--sample-title <title>`.
  - **A word list or a parser:** ask the user for a sample file: text that uses the list's words, or code for the
    parser, such as a file from the parser's `fixtures` in cspell-parsers. Pass it with `--sample-file <file>`.
- **Description:** a parser needs `--description`, one sentence for the Marketplace. Ask the user.
- **License:** the default, `GPL-3.0-or-later`, unless the user asks for another (`--license <spdx>`). It covers the
  extension's own code; each package keeps its own license.

### 5. Run the generator

- **Do,** with every answer as an option, so it never prompts:

  ```sh
  npm run create:extension -- <name> --package <package> [--package <package>…] --yes \
    [--sample-title <title>] [--sample-file <file>] [--description "<sentence>"]
  ```

- **If it fails:**
  - On a missing or invalid value, nothing was written. Fix that option and run it again.
  - If `extensions/<name>/` exists, ask before passing `--force`, which replaces it.
  - If it fails after creating the folder (installing or the sync), show the user the error, and stop. Leave the
    folder for them to look at.

### 6. Fix the sample

- **Do:**

  ```sh
  npm run check:extension -- <name>
  ```

- **If the sample check fails** on words the dictionary doesn't know:
  - Names, places and other non-words go in `words` in `extensions/<name>/samples/cspell.json`.
  - A real word the dictionary lacks belongs upstream in cspell-dicts. Shorten the sample around it, or add it to
    `words`, and list it for the user.
  - Keep the sample's source and license line.
- **Done when** the check passes and every word in `words` is listed for the user.

### 7. Edit the README

- **Check** when each dictionary is on, in `extensions/<name>/static/dictionaries.json`: for some locales, for some
  file types, for all, or "off until turned on" (such as `@cspell/dict-vim`), which people turn on with the
  extension's commands.
- **Do:** in `extensions/<name>/README.md`, change the text outside the `@@inject` markers: what the extension adds,
  who it's for, and whether it's on once installed, matching that check. Keep the markers and the commands section;
  the sync fills those sections in.

### 8. Run every check

- **Do,** after the last change:

  ```sh
  npm run check:extension -- <name> --vscode
  ```

- **If the VS Code test can't run here** (no display, or the download fails), say so to the user and leave it to CI.
  Run the rest without `--vscode` until it passes.
- **Done when** every check passes, or only the VS Code test couldn't run and the user knows.

### 9. Commit, then ask before the PR

- **Do:** commit the new folder with the message `feat: add <friendly name> extension`, such as
  `feat: add Scottish Gaelic extension`. Leave the root README lists, `release-please-config.json` and the workflow
  lists alone: a workflow updates them after the merge.
- **Stop and ask** before pushing and opening the PR. Show the title and the description:
  - what the extension adds, and the packages it includes
  - when each dictionary is on, from `static/dictionaries.json`
  - the sample's source
  - the words added to `samples/cspell.json`
  - whether the VS Code test ran

## Not this skill

- **Words missing from a dictionary:** they belong upstream, in cspell-dicts. Say so.
- **Changing an existing extension:** edit its `extension.config.json` and run `npm run sync:extensions`, as
  `docs/extension-anatomy.md` describes.
