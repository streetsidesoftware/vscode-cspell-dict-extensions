#!/usr/bin/env node

/**
 * Delete the build output of an extension: `out/` and the `*.vsix` packages in the current directory.
 *
 * Usage, from an extension's directory: `node ../../scripts/clean.mts`
 */

import fs from 'node:fs/promises';

async function run(): Promise<void> {
    for await (const target of fs.glob(['out', '*.vsix'])) {
        await fs.rm(target, { recursive: true, force: true });
    }
}

await run();
