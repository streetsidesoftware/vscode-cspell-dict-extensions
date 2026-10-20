# Releasing

<!--
audience: maintainer
kind: reference
level: has write access; releases and publishes the extensions
-->

> [!WARNING]
> For maintainers. Contributors don't need it: maintainers release merged pull requests.

release-please opens a release PR from the Conventional Commits on `main`, one release per extension. Merging it publishes the released extensions to the VS Code Marketplace and Open VSX.

## Pre-release mode

While an extension's `package.json` has `"vsce": { "preRelease": true }`, every release of it is published as a pre-release. The " 👀 Set Prerelease" workflow opens a PR that turns the mode on or off for one extension. Turning it off is a `fix:` commit, so the next release is a stable version above the pre-releases.

## Releasing a runtime change

Every extension bundles the runtime, so a change to it reaches people only when the extensions are released. The runtime is a release-please package, and each extension lists it in `devDependencies`. A `fix:` or `feat:` commit that changes `extension-runtime/` releases the runtime, and release-please's `node-workspace` plugin then releases every extension with it. A `chore:` commit releases nothing.

## Manual publishing

**Open VSX**

```sh
OVSX_TOKEN=YOUR_TOKEN npm -p run publish-all-ovsx
```

**VS Code Marketplace**

```sh
npm run publish-all
```

## Tokens

**VS Code Marketplace:** follow [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), with the [Street Side Software organization on Azure](https://dev.azure.com/streetsidesoftware/), then:

```sh
npx vsce login streetsidesoftware
```
