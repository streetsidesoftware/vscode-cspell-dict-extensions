# VS Code Spelling Dictionary Extension Generator

Generate a VS Code Spelling Dictionary Extension.

## Usage

In the `vscode-cspell-dict-extensions` repository root directory:

```bash
npm run create:extension
```

Pass a name to use it as the default answer to the first question:

```bash
npm run create:extension -- swedish
```

The generator asks a few questions, writes the extension into `extensions/<name>`, installs the dictionary, and formats the files with prettier. Use `--skip-install` to only write the files.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for a description of each question.

## Development

The generator is written in TypeScript and runs directly with Node.js (type stripping), without a build step or runtime dependencies.

- `run.mts` — the command line entry point.
- `src/questions.mts` — the questions and their defaults.
- `src/writeExtension.mts` — renders and copies the files in `templates/`.
- `src/render.mts` — renders the template syntax: `<%= value %>` inserts a value (HTML escaped), and `<% if (value) { %> … <% } else { %> … <% } %>` includes text conditionally.

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
