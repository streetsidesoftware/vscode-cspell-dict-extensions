#!/usr/bin/env node

/**
 * Sync the extensions that have an `extension.config.json` with `extension-runtime/`.
 *
 * Usage: sync-extensions.mts [--check] [extension...]
 *
 * - `--check`: change nothing; list the files that are out of date and exit with 1 if there are any.
 * - `extension`: the directory names in `extensions/` to sync. Default: all of them.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import { readPackageJson } from './lib/extensionHelper.mts';
import { configFileName, repoRoot, syncExtension } from './lib/syncExtension.mts';

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({
        options: { check: { type: 'boolean', default: false } },
        allowPositionals: true,
    });

    const extensionsDir = path.join(repoRoot, 'extensions');
    const names = positionals.length ? positionals : (await fs.readdir(extensionsDir)).sort();
    const rootPkg = await readPackageJson(path.join(repoRoot, 'package.json'));
    const vscodeEngine = rootPkg.engines?.vscode ?? '^1.125.0';
    const { engines } = JSON.parse(await fs.readFile(path.join(repoRoot, 'static/engines.json'), 'utf8'));

    let synced = 0;
    let outOfDate = 0;
    for (const name of names) {
        const dir = path.join(extensionsDir, name);
        if (!(await isFile(path.join(dir, configFileName)))) {
            if (positionals.length) throw new Error(`extensions/${name}/${configFileName} not found.`);
            continue;
        }
        ++synced;
        const changed = await syncExtension(dir, { check: values.check, vscodeEngine, engines });
        for (const { file, action } of changed) {
            const verb = values.check ? 'Out of date' : action === 'remove' ? 'Removed' : 'Updated';
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

async function isFile(file: string): Promise<boolean> {
    try {
        return (await fs.stat(file)).isFile();
    } catch {
        return false;
    }
}

await run();
