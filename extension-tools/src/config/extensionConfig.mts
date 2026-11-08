/**
 * An extension's config, `extension.config.json`: the only code that reads or writes the file. A config is checked
 * against the schema and written with its locales as BCP 47 tags, and formatted.
 */

import path from 'node:path';

import type { ExtensionConfig, ExtensionKind } from '../extension-runtime-api.mts';
import { canonicalLocale, exists, extensionRepoPath, format, readJson, writeIfChanged } from '../helpers/index.mts';
import { readExtensionConfigValidator } from './schema.mts';
import type { ExtensionConfigValidator } from './schema.mts';

export const configFileName = 'extension.config.json';

/** Whether the extension has an `extension.config.json`. One maintained by hand has none. */
export async function hasConfig(extensionDir: string): Promise<boolean> {
    return exists(path.join(extensionDir, configFileName));
}

/**
 * The `kind` in an extension's `extension.config.json`, unchecked: workflows read it before `npm ci` installs the
 * schema checker.
 * @returns `undefined` when the extension has no `extension.config.json`.
 */
export async function readConfigKind(extensionDir: string): Promise<ExtensionKind | undefined> {
    if (!(await hasConfig(extensionDir))) return undefined;
    return (await readJson<{ kind: ExtensionKind }>(path.join(extensionDir, configFileName))).kind;
}

/** Read an extension's `extension.config.json`, checked against the schema, with its locales as BCP 47 tags. */
export async function readConfig(extensionDir: string, validate?: ExtensionConfigValidator): Promise<ExtensionConfig> {
    const file = path.join(extensionDir, configFileName);
    const repoFile = `${extensionRepoPath(extensionDir)}/${configFileName}`;
    if (!(await exists(file))) throw new Error(`${repoFile} not found: the extension is maintained by hand.`);
    return canonicalConfig((validate ?? (await readExtensionConfigValidator()))(await readJson(file), repoFile));
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
    return writeIfChanged(file, text, options.check);
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
