# Copilot instructions for `vscode-cspell-dict-extensions`

## Repository shape

- This is an npm + `lerna-lite` monorepo of many VS Code extensions, mostly under `extensions/*`.
- Most extension packages have the same shape: `package.json`, `src/extension.ts`, `cspell-ext.json`, `samples/`, and local build/test scripts.
- There are three important support packages:
  - `generator-cspell-dicts-extensions/` — scaffolds new extensions; prefer `npm run create:extension` instead of copying an existing extension by hand.
  - `test-runner/` — shared VS Code integration test harness.
  - `scripts/` — repo maintenance and generation scripts.
- Two extensions are notable special cases:
  - `extensions/timestamp-hover/` is a standalone utility extension, not a dictionary wrapper.
  - `extensions/hunspell-syntax/` is a syntax-highlighting extension.

## Tooling and runtime

- Use Node.js `22.21.1` from `.tool-versions`.
- Package manager is npm; `pnpm` and `yarn` are intentionally disabled in `package.json`.
- Root scripts:
  - `npm run build` → `lerna run build`
  - `npm run test` → `lerna run test`
  - `npm run lint` → runs the root cspell check
  - `npm run test:cspell` → runs sample spelling checks across extensions
  - `npm run create:extension` → scaffold a new extension
  - `npm run gen:readme` → regenerate workspace metadata, extension lists, README injections, and normalize extension manifests
  - `npm run gen:release-please` → regenerate release-please config
  - `npm run gen:workflow` → regenerate `.github/workflows/manual-publish.yml`

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
- Do not hand-edit the extension choice list in `/.github/workflows/manual-publish.yml`; regenerate it with `npm run gen:workflow`.
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
