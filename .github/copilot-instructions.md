# Copilot instructions for `vscode-cspell-dict-extensions`

## Repository shape

- This is an npm + `lerna-lite` monorepo of many VS Code extensions, mostly under `extensions/*`.
- Most extension packages have the same shape: `package.json`, `src/extension.ts`, `cspell-ext.json`, `samples/`, and local build/test scripts.
- Synced extensions (those with an `extension.config.json`) have no `src/extension.ts`: their code is in `extension-runtime/`, their data in `extension.config.json`, and `npm run sync:extensions` writes their tool configs, `static/` files, derived `package.json` fields and README injections. Edit the config or the shared files, never the written files. See "Synced extensions" in `CONTRIBUTING.md`.
- There are three important support packages:
  - `generator-cspell-dicts-extensions/` — scaffolds new extensions; prefer `npm run create:extension` instead of copying an existing extension by hand. It is TypeScript (`.mts`) run directly by Node, using `@inquirer/prompts` and `commander`. The extension files come from `templates/`, which use a small EJS subset (`<%= value %>` and `<% if (value) { %> … <% } else { %> … <% } %>`) rendered by `src/render.mts`. Run its unit tests with `npm test` inside the generator directory.
  - `test-runner/` — shared VS Code integration test harness.
  - `scripts/` — repo maintenance and generation scripts, including `sync-extensions.mts`.
  - `extension-runtime/` — the shared code, the `ExtensionConfig` type (source of `static/extension.config.schema.json`), and the templates of the synced extensions.
- Two extensions are notable special cases:
  - `extensions/timestamp-hover/` is a standalone utility extension, not a dictionary wrapper.
  - `extensions/hunspell-syntax/` is a syntax-highlighting extension.

## Tooling and runtime

- Use Node.js `24.22.0` from `.tool-versions`.
- Package manager is npm; `pnpm` and `yarn` are intentionally disabled in `package.json`.
- Root scripts:
  - `npm run build` → `lerna run build`
  - `npm run test` → `lerna run test`
  - `npm run lint` → runs the root cspell check
  - `npm run lint:code` → runs oxlint with type-aware rules; warnings fail the check
  - `npm run check-types` → type-checks `test-runner` and the generator
  - `npm run test:cspell` → runs sample spelling checks across extensions
  - `npm run create:extension` → scaffold a new extension
  - `npm run gen:readme` → regenerate workspace metadata, extension lists, README injections, and normalize extension manifests
  - `npm run gen:release-please` → regenerate release-please config
  - `npm run gen:workflow` → regenerate the extension choice lists in `.github/workflows/manual-publish.yml` and `set-prerelease.yml`

## Efficient workflow

- For a change inside one extension, work in `extensions/<name>/` first and use that package's scripts:
  - `npm run build`
  - `npm run test:cspell`
  - `npm run test:vscode`
- Use root-level commands only when you need cross-repo validation or you changed shared tooling/scripts.
- Prefer `rg`/`glob` over opening the whole monorepo; there are many nearly identical extension packages.
- If the task is “add a new dictionary extension”, use the generator and then review the generated files instead of creating files manually.
- If the task is “add words to an existing language”, check whether the real source of truth is upstream in `streetsidesoftware/cspell-dicts`; `CONTRIBUTING.md` explicitly says many dictionary word additions belong there first.

## Generated or normalized files

- Do not hand-edit generated README sections in `/README.md`; regenerate them with `npm run gen:readme`.
- `npm run gen:readme` also updates:
  - `/dict-extensions.code-workspace`
  - `/static/generated/*.md`
  - extension README injections
  - extension `package.json` normalization via `scripts/fix-extensions.mts`
- Do not hand-edit the extension choice lists in `/.github/workflows/manual-publish.yml` and `/.github/workflows/set-prerelease.yml`; regenerate it with `npm run gen:workflow`.
- If package/release metadata needs refreshing, use `npm run gen:release-please`.

## Validation guidance

- Typical focused validation for one extension:
  1. `cd extensions/<name>`
  2. `npm install`
  3. `npm run build`
  4. `npm run test:cspell`
  5. `npm run test:vscode`
- VS Code tests use the shared `test-runner/` package. If no `--vscode-path` is supplied, the runner downloads VS Code into `.vscode-test/`; CI pre-downloads it with `npm run test:download-vscode`.
- For repo-wide changes to scripts or shared tooling, run the relevant root script (`build`, `test`, `lint`, or one of the `gen:*` scripts) instead of validating only a single extension.

## Known gotchas / errors and workarounds

- Root `npm install` is intentionally expensive: the root `postinstall` runs `lerna exec "npm i"` across every workspace. This is expected, not a failure. Work around it by installing only inside the extension you are changing unless you truly need the whole monorepo installed.
- README, workspace, and workflow metadata are partly generated. If a manual edit “disappears” or CI rewrites it, regenerate with the matching script instead of fighting the generated output.
- Local `test:vscode` runs may spend time downloading VS Code on first use. Reuse `.vscode-test/` or pass `--vscode-path` when available to avoid repeated downloads.
