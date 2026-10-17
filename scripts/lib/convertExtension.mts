/**
 * Turn an extension from before the sync into a synced one: derive its `extension.config.json` from its
 * `package.json`, `src/extension.ts` and `cspell-ext.json`, and update the hand-written files the sync doesn't own.
 *
 * Temporary: remove it once every extension is converted.
 */

import { type CommandConfig, type ExtensionConfig, resolveCommands } from '../../extension-runtime/src/config.ts';

export interface OldExtension {
    /** The directory name in `extensions/`. */
    name: string;
    packageJson: {
        displayName: string;
        description: string;
        scripts?: Record<string, string>;
        contributes?: { commands?: { command: string; title: string }[] };
    };
    /** The content of `src/extension.ts`. */
    extensionTs: string;
    /** The content of `cspell-ext.json`, which may have trailing commas. */
    cspellExt: string;
    /** The `engines` of each imported dictionary package's `cspell-ext.json`, by import path. */
    importedEngines?: Record<string, Record<string, string> | undefined>;
}

export interface Converted<T> {
    value: T;
    warnings: string[];
}

const displayNameSuffix = ' - Code Spell Checker';

/**
 * Derive `extension.config.json` from an extension's old files.
 */
export function deriveConfig(old: OldExtension): Converted<ExtensionConfig> {
    const warnings: string[] = [];
    const pkg = old.packageJson;

    const friendlyName = pkg.displayName.endsWith(displayNameSuffix)
        ? pkg.displayName.slice(0, -displayNameSuffix.length)
        : pkg.displayName;
    const config: ExtensionConfig = {
        $schema: '../../static/extension.config.schema.json',
        name: old.name,
        friendlyName,
        sample: '',
        cspell: parseJsonc(old.cspellExt) as Record<string, unknown>,
        commands: [],
    };
    if (!pkg.displayName.endsWith(displayNameSuffix)) config.displayName = pkg.displayName;
    if (pkg.description !== `${friendlyName} dictionary extension for VS Code.`) config.description = pkg.description;

    // `test-runner` opens `samples/seattle.md` when the script has no `--sample`.
    config.sample = /--sample\s+(\S+)/.exec(pkg.scripts?.['test:vscode'] ?? '')?.[1] ?? 'samples/seattle.md';

    const engines = mergedEngines(config.cspell, old.importedEngines ?? {});
    if (engines) config.cspell = { ...config.cspell, engines };

    const contributed = pkg.contributes?.commands ?? [];
    const locale = contributed.length ? findLocale(old.extensionTs, warnings) : undefined;
    config.commands = contributed.map(({ command: id, title }) => {
        const command = commandFromId(id, locale ?? '', warnings);
        const resolved = resolveCommands({ ...config, commands: [command] })[0];
        if (resolved?.id !== id) command.id = id;
        if (resolved?.title !== title) command.title = title;
        if (!old.extensionTs.includes(`'${id}'`) && !old.extensionTs.includes('commandEnable')) {
            warnings.push(`Command ${id} is in package.json but not registered in src/extension.ts.`);
        }
        return command;
    });

    return { value: config, warnings };
}

function commandFromId(id: string, locale: string, warnings: string[]): CommandConfig {
    const last = id.slice(id.lastIndexOf('.') + 1);
    const action = /^enable/i.test(last) ? 'enable' : 'disable';
    if (!/^(enable|disable)/i.test(last)) warnings.push(`Can't tell whether ${id} enables or disables.`);
    const command: CommandConfig = { action, toggle: 'locale', value: locale };
    if (last.endsWith('Workspace')) command.scope = 'workspace';
    return command;
}

/**
 * The locale the old `src/extension.ts` enables and disables.
 */
function findLocale(extensionTs: string, warnings: string[]): string | undefined {
    const value = (name: string) => new RegExp(`^const ${name} = '([^']+)';`, 'm').exec(extensionTs)?.[1];
    const locale = value('locale') ?? value('local') ?? value('localeEnable');
    const disable = value('localeDisable');
    if (disable && disable !== locale) {
        warnings.push(`The enable locale (${locale}) and the disable locale (${disable}) differ; using ${locale}.`);
    }
    if (!locale) warnings.push('No locale constant in src/extension.ts; set the command values by hand.');
    return locale;
}

/**
 * The `engines` the extension's dictionaries declare, unless its `cspell-ext.json` already sets them.
 * Defaults come from `static/engines.json`, so only dictionaries that declare engines matter.
 */
function mergedEngines(
    cspell: Record<string, unknown>,
    importedEngines: Record<string, Record<string, string> | undefined>,
): Record<string, string> | undefined {
    if (cspell.engines) return undefined;
    const imports = Array.isArray(cspell.import) ? (cspell.import as string[]) : [];
    const found = imports.map((path) => importedEngines[path]).filter((e) => !!e);
    if (!found.length) return undefined;
    return Object.assign({}, ...found) as Record<string, string>;
}

const standardRequirements =
    '## Requirements\n\nThis extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.\n';
const requirementsRef =
    '../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json';

/**
 * Put `@@inject` markers where the README has the old hand-written requirements and enable/disable sections.
 * The sync fills them in.
 */
export function convertReadme(readme: string, hasCommands: boolean): Converted<string> {
    const warnings: string[] = [];
    let result = readme;

    if (result.includes(standardRequirements)) {
        result = result.replace(
            standardRequirements,
            `<!--- @@inject: ${requirementsRef} --->\n<!--- @@inject-end: ${requirementsRef} --->\n`,
        );
    } else {
        warnings.push('README: no standard "## Requirements" section; add the requirements marker by hand.');
    }

    const enableDisable =
        /### Enable (?:Dictionary|Dictionaries)\n[\s\S]*?(?=### Manual Settings|## Requirements|<!--- @@inject)/;
    if (hasCommands && enableDisable.test(result)) {
        result = result.replace(
            enableDisable,
            '### Enable or Disable the Dictionary\n\n' +
                'Run these commands with `F1` or _View -> Command Palette..._:\n\n' +
                '<!--- @@inject-table: ./static/commands.json --->\n<!--- @@inject-end: ./static/commands.json --->\n\n',
        );
    } else if (hasCommands) {
        warnings.push('README: no "### Enable Dictionary" section; add the commands marker by hand.');
    }

    return { value: result, warnings };
}

/**
 * Point a local cspell config at `static/cspell-ext.json`.
 */
export function convertCspellConfig(content: string): string {
    // `./cspell-ext.json` or `cspell-ext.json`, but not a package's `@cspell/dict-xx/cspell-ext.json`.
    return content.replaceAll(/(^|["'\s[])(?:\.\/)?cspell-ext\.json/gm, '$1./static/cspell-ext.json');
}

/**
 * Parse JSON that may have comments and trailing commas, as `cspell-ext.json` files can.
 */
export function parseJsonc(content: string): unknown {
    let json = '';
    for (let i = 0; i < content.length; ++i) {
        const char = content[i];
        if (char === '"') {
            const end = /"(?:[^"\\]|\\.)*"/y;
            end.lastIndex = i;
            const match = end.exec(content);
            const text = match?.[0] ?? content.slice(i);
            json += text;
            i += text.length - 1;
        } else if (char === '/' && content[i + 1] === '/') {
            while (i < content.length && content[i] !== '\n') ++i;
            json += '\n';
        } else if (char === '/' && content[i + 1] === '*') {
            i = content.indexOf('*/', i + 2) + 1 || content.length;
        } else {
            json += char;
        }
    }
    return JSON.parse(json.replaceAll(/,(\s*[}\]])/g, '$1'));
}
