/**
 * An extension's config, `extension.config.json`: checked against the schema, with its locales as BCP 47 tags, and
 * formatted. The tools read and write it through here. The file itself is read and written by `configFile.mts`, which
 * code that runs before `npm ci` reads directly.
 */

import path from 'node:path';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { canonicalLocale } from './create/locales.mts';
import { readExtensionConfigValidator } from './extensionSchema.mts';
import type { ExtensionConfigValidator } from './extensionSchema.mts';
import { format } from './format.mts';
import { configFileName, hasConfig, readConfigJson, writeConfigText } from './configFile.mts';
import { extensionRepoPath, extensionsDir, listExtensionRepoPaths } from './repo.mts';

/** An extension in `extensions/`, picked by its folder. */
export interface Extension {
    /** The folder in `extensions/`, e.g. `swedish`. */
    folder: string;
    /** The absolute path of the folder. */
    dir: string;
}

/**
 * The extension a command works on: `folder` when it's given, otherwise the folder in `extensions/` that `cwd` is
 * in.
 * @param cwd - where the command was run from. `npm run` starts in the repository root and sets `INIT_CWD`.
 */
export async function pickExtension(
    folder: string | undefined,
    cwd: string = process.env['INIT_CWD'] ?? process.cwd(),
): Promise<Extension> {
    const name = folder ?? folderOf(cwd);
    if (!name) throw new Error('Name the extension with -e <folder>, or run the command in its folder.');
    // Only a folder in `extensions/` itself: `swedish/`, `./swedish` or `..` would reach other paths.
    const folders = (await listExtensionRepoPaths()).map((repoPath) => path.posix.basename(repoPath));
    if (!folders.includes(name)) throw new Error(`"${name}" isn't an extension: no extensions/<folder>/package.json.`);
    return { folder: name, dir: path.join(extensionsDir, name) };
}

/** The folder in `extensions/` that `cwd` is in. */
function folderOf(cwd: string): string | undefined {
    const relative = path.relative(extensionsDir, cwd);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return relative.split(path.sep)[0];
}

/** Read an extension's `extension.config.json`, checked against the schema, with its locales as BCP 47 tags. */
export async function readConfig(extensionDir: string, validate?: ExtensionConfigValidator): Promise<ExtensionConfig> {
    const repoFile = `${extensionRepoPath(extensionDir)}/${configFileName}`;
    if (!(await hasConfig(extensionDir)))
        throw new Error(`${repoFile} not found: the extension is maintained by hand.`);
    return canonicalConfig(
        (validate ?? (await readExtensionConfigValidator()))(await readConfigJson(extensionDir), repoFile),
    );
}

/**
 * Write an extension's `extension.config.json`, after checking it against the schema, with its locales as BCP 47 tags.
 * @param options - `check` only reports whether the file would change; `validate` checks it against the schema.
 * @returns whether the file changed.
 */
export async function writeConfig(
    extensionDir: string,
    config: ExtensionConfig,
    options: { check?: boolean | undefined; validate?: ExtensionConfigValidator } = {},
): Promise<boolean> {
    const file = path.join(extensionDir, configFileName);
    (options.validate ?? (await readExtensionConfigValidator()))(
        config,
        `${extensionRepoPath(extensionDir)}/${configFileName}`,
    );
    const text = await format(file, JSON.stringify(canonicalConfig(config), null, 4) + '\n');
    return writeConfigText(extensionDir, text, options.check);
}

/**
 * The config with each locale as a BCP 47 tag, such as `de-AT` for `de-at` or `de_AT`: in `locale` and in the commands
 * that enable or disable a locale. cspell matches locales without regard to case or separator, so only the spelling
 * changes.
 */
function canonicalConfig(config: ExtensionConfig): ExtensionConfig {
    const commands = config.commands.map((command) =>
        command.toggle === 'locale' ? { ...command, value: canonicalLocales(command.value) } : command,
    );
    return config.kind === 'language'
        ? { ...config, locale: canonicalLocales(config.locale), commands }
        : { ...config, commands };
}

/** A comma-separated list of locales, such as `sv-SE,sv`, each as a BCP 47 tag. */
function canonicalLocales(locales: string): string {
    return locales.split(',').map(canonicalLocale).join(',');
}
