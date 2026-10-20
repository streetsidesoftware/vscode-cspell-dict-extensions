---
name: new-extension
description: 'Creates a new extension in this repo, from request to one pull request: finds the published @cspell/dict-* or @cspell/parser-* package, runs the generator, gets the sample and the checks passing, and, once the user agrees, opens the PR. Use when asked to add or create an extension for a language, word list, dictionary or parser, such as "add an extension for Thai".'
---

# new-extension

Takes a request such as "add an extension for Thai" to one pull request. The steps for contributors are in
`docs/guides/new-extension.md`. The generator's options are in `generator-cspell-dicts-extensions/README.md`. Read
both first. This skill runs the generator without questions (`--yes`). It adds the points where you stop and ask the
user.

## Workflow

### 1. Install

- **Do,** in the repository root:

  ```sh
  npm ci
  ```

  The generator and `list:packages` need a network connection. They read the npm registry, the package lists of
  cspell-dicts and cspell-parsers, and Wikipedia.

### 2. Find the package

An extension includes a published package, unchanged. Find the one the request means.

- **Do:** search for the English name, the natural language's own name, its language code, or the topic. Several
  words must all match. Pass `--any` to match any of them.

  ```sh
  npm run list:packages -- <word>...
  npm run list:packages -- gaelic irish --any
  ```

- **Stop and ask** when:
  - **Nothing matches.** The package must be published first, in
    [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts) or
    [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). Say so, and stop.
  - **The request is ambiguous.** "Gaelic" could mean Scottish Gaelic (`@cspell/dict-gd`) or Irish (no package). List
    the matches and ask which.
  - **The match is narrower than the request, or different.** "Lisp" finds only `@cspell/dict-elisp`, whose Name is
    "Emacs Lisp". Show the package and ask whether it's the one.
  - **The Extension column says "ships with cspell".** cspell already includes it, so it needs no extension. Say so,
    and stop.
  - **The Extension column names an extension.** Show it. Ask whether to change that extension instead or create
    another one. Both are allowed.
  - **The Kind column says bundle.** The generator can't make a bundle. Say so, and stop.
- **Done when** the user's request names exactly one set of packages, or the user has chosen.

### 3. Branch

- **Do:** work on a new branch `new-extension/<name>` from up-to-date `origin/main`. Or work on the fresh branch you're
  already on for this task.

### 4. Gather the answers

`--yes` never prompts, so every value without a default must be an option. Defaults come from the packages. The
generator README lists them.

- **Name:** a short lowercase English name, such as `thai` or `scottish-gaelic`. It's the folder `extensions/<name>/`.
  It's also the package `code-spell-checker-<name>` and the commands' ID prefix. So it can't change after release. Ask
  when the request doesn't make it obvious.
- **Friendly name:** the name users see in the Marketplace, the README and the command titles. The default is the name
  with each word capitalized: `scottish-gaelic` gives "Scottish Gaelic". When that isn't how the language or topic is
  written, pass `--friendly-name`, such as `--friendly-name "Brazilian Portuguese"` or
  `--friendly-name "Emacs Lisp"`. Ask when you aren't sure.
- **Sample:**
  - **A natural language:** the generator fetches the Wikipedia article about Seattle in that language. If that
    language's Wikipedia has none, the generator stops with an error. Ask the user for another article. Pass
    `--sample-title <title>`, once for each article.
  - **A word list or a parser:** ask the user for a sample file. It's text that uses the list's words, or code for the
    parser, such as a file from the parser's `fixtures` in cspell-parsers. Its file extension must match one of the
    dictionary's file types, such as `.clj` for Clojure. When a word list has several file types, ask for one file per
    type. Pass each with `--sample-file <file>`, a relative path from the repository root, or an absolute path. It
    can't be combined with `--sample-title`.
- **Description:** a parser needs `--description`, one sentence for the Marketplace. Ask the user.
- **License:** leave the default, `GPL-3.0-or-later`, and never pass `--license`. If the user asks for another
  license, say that the extension is created with the default, and that they change it themselves.

### 5. Run the generator

- **Do,** with every answer as an option, so it never prompts:

  ```sh
  npm run create:extension -- <name> --package <package> [--package <package>…] --yes \
    [--friendly-name "<name>"] [--sample-title <title>] [--sample-file <file>] [--description "<sentence>"]
  ```

- **If it fails:**
  - On a missing or invalid value, nothing was written. Fix that option and run it again.
  - If `extensions/<name>/` exists, ask before passing `--force`, which replaces it.
  - If it refuses a sample file because the file turns on no dictionary, it names the file types it expects and
    removes the folder. Ask the user for a file of one of those types, and run it again.
  - If it fails after creating the folder (installing or the sync), show the user the error, and stop. Leave the
    folder for them to look at.

### 6. Fix the sample

- **Do:**

  ```sh
  npm run check:extension -- <name>
  ```

- **If the sample check fails** on words the dictionary doesn't know, add them to the sample itself. Leave
  `samples/cspell.json` as the generator wrote it.
  - Put names, pieces of words and other non-words on an `ignore` line, such as `Siatail`.
  - Put real words the dictionary lacks on a `words` line. They belong upstream in cspell-dicts, so list them for the
    user.
  - Each is one line at the end of the sample: an HTML comment in Markdown, a line comment in code. For example:

    ```markdown
    <!--- cspell:ignore Siatail --->
    ```

  - Keep the sample's source and license line.
- **Stop and ask** when you can't tell whether an unknown word is a real word, a name or a piece of a word. This is
  likely in a script without spaces between words, such as Thai. Show the user the list. Recommend `ignore` for each,
  unless it's clearly a real word.
- **Done when** the sample check passes, and every word on a `words` or `ignore` line is listed for the user.

### 7. Read the README

- **Do:** read `extensions/<name>/README.md`. The generator writes it complete, including when each dictionary is on.
  Add only what users should know, such as where the words come from. Keep the `@@inject` markers and the commands
  section. The sync fills those sections in.

### 8. Run every check

- **Do,** after the last change:

  ```sh
  npm run check:extension -- <name> --vscode
  ```

  For a new extension, these are all the checks. The root checks in `AGENTS.md` are for changes outside
  `extensions/<name>/`.

- **If the VS Code test can't run here** (no display, or the download fails), say so to the user and leave it to CI.
  Then run `npm run check:extension -- <name>`, without `--vscode`, until it passes. A failing VS Code test retries
  three times, so it's slow.
- **Done when** every check passes, or only the VS Code test couldn't run and the user knows.

### 9. Commit, ask, then open the PR

- **Do:** commit the new folder with the message `feat: add <friendly name> extension`, such as
  `feat: add Scottish Gaelic extension`. Leave the root README lists, `static/dictionary-types.json`,
  `release-please-config.json` and the workflow lists alone. A workflow updates them after the merge.
- **Stop and ask** before pushing and opening the PR. Show the title and the description:
  - what the extension adds, and the packages it includes
  - when each dictionary is on, from `static/dictionaries.json`
  - the sample's source
  - the words on the sample's `words` and `ignore` lines
  - whether the VS Code test ran
- **After the user agrees:** push `new-extension/<name>`. Open the PR against `main`, with the title and description
  you showed.
- **Done when** the PR is open and the user has its link.

## Not this skill

- **Words missing from a dictionary:** they belong upstream, in cspell-dicts. Say so.
- **Changing an existing extension:** see "Files you edit" in `docs/extension-anatomy.md`.
