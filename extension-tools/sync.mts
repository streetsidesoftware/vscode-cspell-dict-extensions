#!/usr/bin/env node

/**
 * Sync the extensions that have an `extension.config.json` with `extension-runtime/`. Each `extension.config.json` is
 * checked against the runtime's schema first.
 *
 * Usage: `sync.mts [--check] [folder...]`
 *
 * - `--check`: change nothing; list the files that are out of date and exit with 1 if there are any.
 * - `folder`: the folders in `extensions/` to sync. Default: all of them.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import { readExtensionConfigValidator } from './src/extensionSchema.mts';
import { exists, extensionsDir, readVscodeEngine } from './src/repo.mts';
import { configFileName, syncExtension } from './src/syncExtension.mts';

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({
        options: { check: { type: 'boolean', default: false } },
        allowPositionals: true,
    });

    const names = positionals.length ? positionals : (await fs.readdir(extensionsDir)).sort();
    const vscodeEngine = await readVscodeEngine();

    const validate = await readExtensionConfigValidator();
    let outOfDate = 0;

    let synced = 0;
    for (const name of names) {
        const extensionDir = path.join(extensionsDir, name);
        if (!(await exists(path.join(extensionDir, configFileName)))) {
            if (positionals.length) throw new Error(`extensions/${name}/${configFileName} not found.`);
            continue;
        }
        ++synced;
        const changed = await syncExtension(extensionDir, { check: values.check, vscodeEngine, validate });
        for (const { file, action } of changed) {
            const verb = values.check
                ? 'Out of date'
                : { create: 'Created', update: 'Updated', remove: 'Removed' }[action];
            console.log(`${verb}: extensions/${name}/${file}`);
        }
        outOfDate += changed.length;
    }

    console.log(`Synced ${synced} extension${synced === 1 ? '' : 's'}.`);
    if (values.check && outOfDate) {
        console.error(
            styleText('red', 'Run `extension-tools/sync.mts` and commit the changes.', { stream: process.stderr }),
        );
        process.exitCode = 1;
    }
}

await run();
