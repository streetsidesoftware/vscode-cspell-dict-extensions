# Releasing

<!--
audience: maintainer
kind: reference
level: has write access; releases and publishes the extensions
-->

> [!WARNING]
> For maintainers. Contributors don't need it: maintainers release merged pull requests.

release-please opens a release PR from the Conventional Commits on `main`, one release per extension. Merging it publishes the released extensions to the VS Code Marketplace and Open VSX.

A `feat:` or `fix:` commit releases the extensions it changes. A `chore:`, `ci:` or `docs:` commit releases nothing.

## A new extension

After a new extension's pull request merges, the " 🔗 Update Extension Lists" workflow opens a `ci: Update README / Extensions List` PR. It adds the extension to the README lists and to `release-please-config.json`. It also adds the extension to the Manual Publish and Set Prerelease workflows. That PR releases nothing. Once it merges, release-please includes the extension in its next release PR, with the extension's first `feat:` commit. Merging that release PR publishes the first release.

## Pre-release mode

While an extension's `package.json` has `"vsce": { "preRelease": true }`, every release of it is published as a pre-release. The " 👀 Set Prerelease" workflow opens a PR that turns the mode on or off for one extension. Turning it on is a `chore:` commit, so it releases nothing. The extension's next `feat:` or `fix:` release is then a pre-release. Turning it off is a `fix:` commit, so the next release is a stable version above the pre-releases.

## Releasing a runtime change

Every synced extension bundles the runtime into its `extension.js`, which is committed. `hunspell-syntax` and `timestamp-hover` don't use it. On every pull request, the `autofix.ci` workflow rebuilds each `extension.js` and pushes any change to the pull request. So a runtime change that alters what an extension ships changes that extension's files in the same commit. A `fix:` or `feat:` commit then releases each of those extensions with that commit's bump and changelog line. A change that leaves every `extension.js` the same releases no extension. A `chore:` commit releases nothing. The changed `extension.js` files show the reviewer which extensions a pull request releases.

## Manual publishing

Run the " 📢 Manual Publish" workflow from the Actions tab. Choose the ref to publish from, and one extension or `all`. It publishes to both the VS Code Marketplace and Open VSX, with each extension's pre-release setting.

## Tokens

The publish workflows use two repository secrets:

- **`VSCE_TOKEN`:** an Azure DevOps personal access token for the VS Code Marketplace, with the **Marketplace (Manage)** scope. Create it in the [Street Side Software organization on Azure](https://dev.azure.com/streetsidesoftware/). See [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token).
- **`OVSX_TOKEN`:** an [Open VSX access token](https://open-vsx.org/user-settings/tokens) for the `streetsidesoftware` namespace.

When a token expires, create a new one and update the secret in the repository's settings.
