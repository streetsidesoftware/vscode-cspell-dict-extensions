/**
 * Sync or check the extensions in `extensions/`, picked by folder.
 */

import path from 'node:path';

import { findDrift } from './drift.mts';
import { readExtensionConfigValidator } from './extensionSchema.mts';
import { exists, extensionsDir, listExtensionRepoPaths, readJson, readVscodeEngine } from './repo.mts';
import { configFileName, type FileChange, syncExtension, syncPackageJson } from './syncExtension.mts';

export interface Finding {
    /** A repo path, e.g. `extensions/swedish/README.md`. */
    file: string;
    message: string;
}

export interface SyncResult {
    /** The files that changed, or with `check`, would change. */
    changes: (FileChange & { folder: string })[];
    /** With `check`: the drift between the configs and the installed packages. */
    drift: Finding[];
    /** The number of folders synced. */
    count: number;
}

/**
 * Sync the extensions: an extension with an `extension.config.json` gets every file the sync writes; one without, the
 * shared `package.json` fields.
 * @param folders - folders in `extensions/`. Default: all of them.
 * @param check - change nothing: report the files that would change, and the drift.
 */
export async function syncExtensions(folders: string[], check: boolean): Promise<SyncResult> {
    const all = (await listExtensionRepoPaths()).map((repoPath) => path.basename(repoPath));
    for (const folder of folders) {
        if (!all.includes(folder)) throw new Error(`extensions/${folder}/package.json not found.`);
    }
    await assertUniqueNames(all);

    const vscodeEngine = await readVscodeEngine();
    const validate = await readExtensionConfigValidator();
    const result: SyncResult = { changes: [], drift: [], count: 0 };
    for (const folder of folders.length ? folders : all) {
        const extensionDir = path.join(extensionsDir, folder);
        const hasConfig = await exists(path.join(extensionDir, configFileName));
        const changes = hasConfig
            ? await syncExtension(extensionDir, { check, vscodeEngine, validate })
            : await syncPackageJson(extensionDir, { check, vscodeEngine });
        result.changes.push(...changes.map((change) => ({ ...change, folder })));
        if (check && hasConfig) {
            const file = `extensions/${folder}/${configFileName}`;
            const config = validate(await readJson(path.join(extensionDir, configFileName)), file);
            result.drift.push(...(await findDrift(extensionDir, config)).map((message) => ({ file, message })));
        }
        ++result.count;
    }
    return result;
}

/** Two configs with the same `name` would publish two packages called `code-spell-checker-<name>`. */
async function assertUniqueNames(folders: string[]): Promise<void> {
    const byName = new Map<string, string[]>();
    for (const folder of folders) {
        const configFile = path.join(extensionsDir, folder, configFileName);
        if (!(await exists(configFile))) continue;
        const { name } = await readJson<{ name: string }>(configFile);
        byName.set(name, [...(byName.get(name) ?? []), folder]);
    }
    const duplicates = [...byName].filter(([, named]) => named.length > 1);
    if (duplicates.length) {
        const lines = duplicates.map(
            ([name, named]) => `  "${name}": ${named.map((f) => `extensions/${f}`).join(', ')}`,
        );
        throw new Error(`These extensions have the same "name" in ${configFileName}:\n${lines.join('\n')}`);
    }
}
