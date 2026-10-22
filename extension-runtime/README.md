# Extension runtime

The code, tool configs and data format shared by every extension in [`extensions/`](../extensions) that has an `extension.config.json`. An extension holds only its data and its own text; `npm run sync:extensions` writes the rest.

Which files the sync writes is in [Anatomy of an extension](../docs/extension-anatomy.md), and how a runtime change is released is in [Releasing](../docs/releasing.md#releasing-a-runtime-change).

## Code

- [`src/config.ts`](./src/config.ts): the `ExtensionConfig` type, the source of [the schema](./extension.config.schema.json).
- [`build-schema.mts`](./build-schema.mts): writes the schema from the type. `npm run build` runs it, and so does a workflow after every merge. Run it after changing `src/config.ts`.
- [`package.json`](./package.json): its `engines.vscode` is the VS Code version the code needs.
- [`api.ts`](./api.ts): what the tools in [`extension-tools/`](../extension-tools) use from the runtime. They import only this file.

Each extension is bundled into one ESM file, `out/extension.js`, with [tsdown](https://tsdown.dev). The shared config in [`tsdown.extension.config.mts`](./tsdown.extension.config.mts) builds the entry [`src/entry.ts`](./src/entry.ts), with the extension's `extension.config.json` and `src/custom.ts` filled in.
