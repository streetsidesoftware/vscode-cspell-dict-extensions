#!/usr/bin/env node

/**
 * Convert extensions from before the sync into synced ones, then sync them.
 *
 * Usage: convert-extensions.mts [--dry-run] <extension...>
 *
 * For each extension in `extensions/`, it writes `extension.config.json` derived from the old `package.json`,
 * `src/extension.ts` and `cspell-ext.json`, points the local cspell config at `static/cspell-ext.json`, and puts
 * `@@inject` markers in the README. Then it runs the sync, which writes the rest and removes the old files.
 * Review the warnings and the diff.
 *
 * - `--dry-run`: print the derived configs and the warnings; change nothing.
 *
 * Temporary: remove it once every extension is converted.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import {
    convertCspellConfig,
    convertReadme,
    deriveConfig,
    type OldExtension,
    parseJsonc,
} from './lib/convertExtension.mts';
import { createExtensionConfigValidator, generateExtensionSchema } from './lib/extensionSchema.mts';
import { readPackageJson } from './lib/extensionHelper.mts';
import { configFileName, format, repoRoot, syncExtension } from './lib/syncExtension.mts';

const cspellConfigFiles = ['cspell.json', 'cspell.config.yaml', 'cspell.config.json', '.cspell.json'];

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({
        options: { 'dry-run': { type: 'boolean', default: false } },
        allowPositionals: true,
    });
    if (!positionals.length) {
        console.error('Usage: convert-extensions.mts [--dry-run] <extension...>');
        process.exitCode = 1;
        return;
    }

    const validate = createExtensionConfigValidator(generateExtensionSchema());
    const rootPkg = await readPackageJson(path.join(repoRoot, 'package.json'));
    const vscodeEngine = rootPkg.engines?.vscode ?? '^1.125.0';

    for (const name of positionals) {
        const dir = path.join(repoRoot, 'extensions', name);
        const label = `extensions/${name}`;
        if (await readText(path.join(dir, configFileName))) {
            console.log(`${label}: already converted.`);
            continue;
        }
        const extensionTs = await readText(path.join(dir, 'src/extension.ts'));
        const cspellExt = await readText(path.join(dir, 'cspell-ext.json'));
        if (extensionTs === undefined || cspellExt === undefined) {
            console.log(styleText('yellow', `${label}: not a dictionary extension, skipped.`));
            continue;
        }

        const old: OldExtension = {
            name,
            packageJson: JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8')),
            extensionTs,
            cspellExt,
        };
        old.importedEngines = await importedEngines(dir, old.cspellExt);

        const config = deriveConfig(old);
        if ((await readText(path.join(dir, config.value.sample))) === undefined) {
            config.warnings.push(`The sample ${config.value.sample} doesn't exist; set \`sample\` by hand.`);
        }
        try {
            validate(config.value, `${label}/${configFileName}`);
        } catch (error) {
            console.log(styleText('red', `${label}: ${(error as Error).message}`));
            process.exitCode = 1;
            continue;
        }
        const readme = convertReadme(
            await fs.readFile(path.join(dir, 'README.md'), 'utf8'),
            !!config.value.commands.length,
        );
        const warnings = [...config.warnings, ...readme.warnings];

        if (values['dry-run']) {
            console.log(`${label}:\n${JSON.stringify(config.value, null, 4)}`);
        } else {
            const configFile = path.join(dir, configFileName);
            await fs.writeFile(configFile, await format(configFile, JSON.stringify(config.value, null, 4) + '\n'));
            await fs.writeFile(path.join(dir, 'README.md'), readme.value);
            for (const file of cspellConfigFiles) {
                const content = await readText(path.join(dir, file));
                if (content !== undefined) await fs.writeFile(path.join(dir, file), convertCspellConfig(content));
            }
            await syncExtension(dir, { vscodeEngine, validate });
            console.log(`${label}: converted.`);
        }
        for (const warning of warnings) console.log(styleText('yellow', `${label}: warning: ${warning}`));
    }
}

/**
 * The `engines` declared by the dictionary packages that `cspell-ext.json` imports, read from `node_modules`.
 */
async function importedEngines(dir: string, cspellExt: string): Promise<OldExtension['importedEngines']> {
    const result: NonNullable<OldExtension['importedEngines']> = {};
    for (const [, imported] of cspellExt.matchAll(/"([^"]+\/cspell-ext\.json)"/g)) {
        if (!imported || imported.startsWith('.')) continue;
        const content = await readText(path.join(dir, 'node_modules', imported));
        if (content === undefined) {
            throw new Error(`${path.relative(repoRoot, dir)}: ${imported} not found; run npm install there first.`);
        }
        result[imported] = (parseJsonc(content) as { engines?: Record<string, string> }).engines;
    }
    return result;
}

async function readText(file: string): Promise<string | undefined> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

await run();
