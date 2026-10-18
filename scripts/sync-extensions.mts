#!/usr/bin/env node

/**
 * Sync the extensions that have an `extension.config.json` with `extension-runtime/`, after generating
 * `static/extension.config.schema.json` from the `ExtensionConfig` type.
 *
 * Usage: sync-extensions.mts [--check] [extension...]
 *
 * - `--check`: change nothing; list the files that are out of date and exit with 1 if there are any.
 * - `extension`: the directory names in `extensions/` to sync. Default: all of them.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import { createExtensionConfigValidator, generateExtensionSchema, schemaPath } from './lib/extensionSchema.mts';
import { format } from './lib/format.mts';
import { exists, extensionsDir, readVscodeEngine, repoRoot, writeIfChanged } from './lib/repo.mts';
import { configFileName, syncExtension } from './lib/syncExtension.mts';

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({
        options: { check: { type: 'boolean', default: false } },
        allowPositionals: true,
    });

    const names = positionals.length ? positionals : (await fs.readdir(extensionsDir)).sort();
    const vscodeEngine = await readVscodeEngine();

    // The schema comes from the `ExtensionConfig` type; every extension.config.json is checked against it.
    const schema = generateExtensionSchema();
    const schemaFile = path.join(repoRoot, schemaPath);
    const schemaContent = await format(schemaFile, JSON.stringify(schema, null, 4) + '\n');
    let outOfDate = 0;
    if (await writeIfChanged(schemaFile, schemaContent, values.check)) {
        console.log(`${values.check ? 'Out of date' : 'Updated'}: ${schemaPath}`);
        ++outOfDate;
    }
    const validate = createExtensionConfigValidator(schema);

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
            styleText('red', 'Run `npm run sync:extensions` and commit the changes.', { stream: process.stderr }),
        );
        process.exitCode = 1;
    }
}

await run();
