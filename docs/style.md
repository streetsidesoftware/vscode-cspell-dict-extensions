# Writing docs

<!--
audience: developer
kind: reference
level: writes or edits the docs in this repository
-->

> [!NOTE]
> For anyone writing or editing the docs in this repository.

## Where docs go

- **`docs/`:** docs for contributors and maintainers. Step-by-step guides go in `docs/guides/`.
- **`CONTRIBUTING.md`:** a short index of `docs/`.
- **A package's `README.md`:** reference for that package only, such as the generator's options. It needs no audience header.
- **An extension's `README.md`:** for the users who install it. It's the extension's Marketplace page, so links are absolute `https://` URLs.

## Audience

Each doc is written for one audience, named in a header right below its title. List more than one only when the doc serves each of them:

```markdown
# Creating an extension

<!--
audience: technical contributor
kind: guide
level: comfortable with basic git and a terminal; doesn't read or write code
-->

> [!NOTE]
> For contributors who can fork the repo and follow terminal steps. No coding needed.
```

The HTML comment is for writers and AI agents. GitHub doesn't show it. Its fields:

- **`audience`:** who the doc is for, from the list below. Name more than one with commas.
- **`kind`:** `guide` for steps that do a task, `reference` for facts to look up, or `index` for a list of other docs.
- **`level`:** what the reader can already do, in a few words, or `any`.

The `> [!NOTE]` below it tells readers whether the doc is for them. A maintainer-only doc uses `> [!WARNING]` instead, to warn others off. Write for the reader the header names, and leave out what they don't need.

**Audiences:**

- **VS Code user:** installs the extensions and reads their READMEs. Has no clone.
- **Technical contributor:** forks and clones the repo, and runs the steps in a terminal. Knows basic git. Doesn't read or write code, and is willing to follow clear steps.
- **Developer:** reads and writes the runtime, the generator, the scripts, the configs and the workflows.
- **Maintainer:** has write access, and releases and publishes the extensions.

## Guides

In the part of a guide that does the task, number the steps. Start each with a bold name, such as **Install.** Each step is one thing the reader does. Put each check or choice in its own bullet. A table is fine for a list of questions and their answers, such as the generator's.

## Wording

- One idea per sentence. Split a sentence at a semicolon, a colon or a second "and".
- **Users**, not "people", for whoever installs the extensions.
- An extension **includes** the package it adds. Not "wraps" or "bundles".
- **Natural language** in prose, not "language". The `--kind` value stays `language`.
- No "sync" in docs for contributors. Say what happens, such as "the generator writes it". Docs for developers may say "sync".
- `--yes` and other options without questions are for agents and experts. Guides for contributors use the questions.

## Shared text

Text that more than one doc needs goes in `docs/templates/`, such as the prerequisites. A doc marks where a template goes with two comments, with the template's path relative to the doc:

```markdown
<!--- @@inject: ../templates/prerequisites.md#values-file=:../../package.json --->
<!--- @@inject-end: ../templates/prerequisites.md#values-file=:../../package.json --->
```

A template can use values from a JSON file, such as `{@ engines.node @}`. Name the file after `#values-file=:`, relative to the doc. After a pull request merges, a workflow runs `npm run gen:readme`, which fills the sections in. It fills in `CONTRIBUTING.md`, the docs in `docs/` and the extension-tools README.

Edit the template, not the text between the comments. The workflow overwrites that text.
