// cspell:ignore elisp

/**
 * Sync one extension with `extension-runtime/` and its `extension.config.json`.
 *
 * The sync writes:
 * - the tool configs, copied from `extension-tools/templates/sync/`;
 * - `static/cspell-ext.json`, `static/commands.json` and `static/dictionaries.json`, generated from the config and
 *   the installed dictionaries;
 * - some fields of `package.json`, and the `@@inject` sections of `README.md`.
 *
 * It removes a generated file the extension no longer has. It creates `cspell.config.yaml` when it's missing; after
 * that, the file belongs to the extension. It leaves every other file alone.
 */

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { injectMarkdown } from 'inject-markdown';
import { parse as parseJsonc } from 'jsonc-parser';

import type { CommandConfig, CSpellExtPath, ExtensionConfig } from '../../extension-runtime/api.ts';
import type { DictionaryState } from './dictionaryState.mts';
import type { PackageJson } from './extensionHelper.mts';
import type { ExtensionConfigValidator } from './extensionSchema.mts';
import { format, injectProblems } from './format.mts';
import { exists, readJson, writeIfChanged } from './repo.mts';

export const configFileName = 'extension.config.json';
const cspellExtPath: CSpellExtPath = 'static/cspell-ext.json';
const templateDir = path.join(import.meta.dirname, '../templates/sync');

/** Template files whose names can't be used in `templates/sync/`. */
const renamedTemplateFiles: Record<string, string> = {
    gitignore: '.gitignore',
};

/** Files the sync creates when they're missing. After that, they belong to the extension. */
const starterFiles: Record<string, string> = {
    // Lint checks the extension's own files with its dictionaries.
    'cspell.config.yaml': 'import:\n  - ./static/cspell-ext.json\n',
};

/** Files vsce packages when the extension has them. vsce fails on a `files` pattern that matches nothing. */
const optionalPackagedFiles = ['COPYING'];

export interface SyncOptions {
    /** Only report the files that would change. */
    check?: boolean;
    /** The `engines.vscode` of the runtime's package.json. */
    vscodeEngine: string;
    /** Checks `extension.config.json` against the generated schema. */
    validate: ExtensionConfigValidator;
}

export interface FileChange {
    /** The path relative to the extension. */
    file: string;
    action: 'create' | 'update' | 'remove';
}

/**
 * Sync one extension.
 * @param extensionDir - the extension's directory, as an absolute path.
 * @returns the files that changed (or would change with `check`).
 */
export async function syncExtension(extensionDir: string, options: SyncOptions): Promise<FileChange[]> {
    const config = await readConfig(extensionDir, options.validate);
    const files = await extensionFiles(extensionDir, config, options.vscodeEngine);
    const changes = [
        ...(await writeFiles(extensionDir, files, options.check)),
        ...(await createMissingFiles(extensionDir, options.check)),
        ...(await removeUnusedFiles(extensionDir, files, options.check)),
    ];
    // The README is filled from the files in `static/`. With `check`, they aren't written, so when they're out of
    // date the README can't be checked yet; the check fails on them anyway.
    if (!(options.check && changes.length)) changes.push(...(await syncReadme(extensionDir, options.check)));
    return changes;
}

async function readConfig(extensionDir: string, validate: ExtensionConfigValidator): Promise<ExtensionConfig> {
    const configFile = `${repoPath(extensionDir)}/${configFileName}`;
    return validate(await readJson(path.join(extensionDir, configFileName)), configFile);
}

/** The extension's directory as a repo path, e.g. `extensions/swedish`. */
function repoPath(extensionDir: string): string {
    return `extensions/${path.basename(extensionDir)}`;
}

/**
 * The files the sync owns or derives, by their path relative to the extension.
 */
async function extensionFiles(
    extensionDir: string,
    config: ExtensionConfig,
    vscodeEngine: string,
): Promise<Map<string, string>> {
    const files = new Map<string, string>(await readTemplateFiles());
    files.set(cspellExtPath, JSON.stringify(await cspellExt(extensionDir, config), null, 4) + '\n');
    const commands = commandsTable(config);
    if (commands) files.set('static/commands.json', commands);
    const dictionaries = await dictionariesTable(extensionDir, config);
    if (dictionaries) files.set('static/dictionaries.json', dictionaries);
    const pkg = await readJson<PackageJson>(path.join(extensionDir, 'package.json'));
    const hasCustom = await exists(path.join(extensionDir, 'src/custom.ts'));
    // `tsconfig.json` only type-checks `src/custom.ts`; without it, tsc and VS Code report "No inputs were found".
    if (!hasCustom) files.delete('tsconfig.json');
    const optional = await existingFiles(extensionDir, optionalPackagedFiles);
    files.set('package.json', packageJsonSource(config, pkg, vscodeEngine, hasCustom, optional));
    return files;
}

async function existingFiles(extensionDir: string, files: string[]): Promise<string[]> {
    const found: string[] = [];
    for (const file of files) {
        if (await exists(path.join(extensionDir, file))) found.push(file);
    }
    return found;
}

async function writeFiles(
    extensionDir: string,
    files: Map<string, string>,
    check: boolean | undefined,
): Promise<FileChange[]> {
    const changes: FileChange[] = [];
    for (const [file, content] of files) {
        const formatted = await format(path.join(extensionDir, file), content);
        if (await writeIfChanged(path.join(extensionDir, file), formatted, check)) {
            changes.push({ file, action: 'update' });
        }
    }
    return changes;
}

async function createMissingFiles(extensionDir: string, check: boolean | undefined): Promise<FileChange[]> {
    const changes: FileChange[] = [];
    for (const [file, content] of Object.entries(starterFiles)) {
        const target = path.join(extensionDir, file);
        if (await exists(target)) continue;
        changes.push({ file, action: 'create' });
        if (!check) await fs.writeFile(target, content);
    }
    return changes;
}

/** Removes a generated file the extension no longer has. */
async function removeUnusedFiles(
    extensionDir: string,
    files: Map<string, string>,
    check: boolean | undefined,
): Promise<FileChange[]> {
    // `.vscodeignore` was replaced by `files` in `package.json`; vsce refuses an extension that has both.
    const unused = ['.vscodeignore', 'static/commands.json', 'static/dictionaries.json', 'tsconfig.json'].filter(
        (file) => !files.has(file),
    );
    const changes: FileChange[] = [];
    for (const file of unused) {
        const target = path.join(extensionDir, file);
        if (!(await exists(target))) continue;
        changes.push({ file, action: 'remove' });
        if (!check) await fs.rm(target);
    }
    return changes;
}

async function syncReadme(extensionDir: string, check: boolean | undefined): Promise<FileChange[]> {
    const readme = path.join(extensionDir, 'README.md');
    if (!(await exists(readme))) return [];
    const injected = await format(readme, await injectReadme(readme));
    return (await writeIfChanged(readme, injected, check)) ? [{ file: 'README.md', action: 'update' }] : [];
}

async function readTemplateFiles(): Promise<[string, string][]> {
    const entries = await fs.readdir(templateDir, { recursive: true, withFileTypes: true });
    const files: [string, string][] = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const source = path.join(entry.parentPath, entry.name);
        const relative = path.relative(templateDir, source).split(path.sep).join('/');
        const target = path.posix.join(path.posix.dirname(relative), renamedTemplateFiles[entry.name] ?? entry.name);
        files.push([target, await fs.readFile(source, 'utf8')]);
    }
    return files.sort(([a], [b]) => a.localeCompare(b));
}

/**
 * The content of `static/cspell-ext.json`: `cspell` from the config, with the `engines` the imported dictionaries
 * declare. An engine set in `cspell.engines` wins over the dictionaries.
 */
async function cspellExt(extensionDir: string, config: ExtensionConfig): Promise<Record<string, unknown>> {
    const { engines, ...cspell } = config.cspell as { engines?: Record<string, string> };
    const derived = await dictionaryEngines(extensionDir, config);
    const merged = { ...derived, ...engines };
    return Object.keys(merged).length ? { ...cspell, engines: merged } : cspell;
}

/** The `engines` declared by the dictionaries in `cspell.import`. */
async function dictionaryEngines(extensionDir: string, config: ExtensionConfig): Promise<Record<string, string>> {
    const engines: Record<string, string> = {};
    for (const ext of await readDictionaries(extensionDir, config)) {
        for (const [engine, range] of Object.entries(ext.engines ?? {})) {
            if (engines[engine] !== undefined && engines[engine] !== range) {
                throw new Error(
                    `${repoPath(extensionDir)}: the dictionaries need different ${engine} versions ` +
                        `("${engines[engine]}" and "${range}"). Set it in cspell.engines.`,
                );
            }
            engines[engine] = range;
        }
    }
    return engines;
}

/** The parts of a dictionary's `cspell-ext.json` the sync reads. */
interface DictionaryExt {
    engines?: Record<string, string>;
    dictionaryDefinitions?: { name: string }[];
    dictionaries?: string[];
    languageSettings?: LanguageSetting[];
    overrides?: Override[];
}

interface LanguageSetting {
    // cspell takes a comma-separated list or an array.
    languageId?: string | string[];
    locale?: string | string[];
    dictionaries?: string[];
}

interface Override {
    filename: string | string[];
    languageId?: string | string[];
    /** The locale. */
    language?: string | string[];
    dictionaries?: string[];
}

/** The `cspell-ext.json` of each dictionary in `cspell.import`, read from the extension's `node_modules`. */
async function readDictionaries(extensionDir: string, config: ExtensionConfig): Promise<DictionaryExt[]> {
    const imports = (config.cspell as { import?: string[] }).import ?? [];
    const require = createRequire(path.join(extensionDir, 'package.json'));
    const exts: DictionaryExt[] = [];
    for (const spec of imports.filter((spec) => !spec.startsWith('.'))) {
        let file: string;
        try {
            file = require.resolve(spec);
        } catch {
            throw new Error(`${repoPath(extensionDir)}: can't find "${spec}". Run \`npm install\` first.`);
        }
        // A dictionary's cspell-ext.json may have comments.
        exts.push(parseJsonc(await fs.readFile(file, 'utf8')) as DictionaryExt);
    }
    return exts;
}

/**
 * The settings that name the extension's dictionaries, as table rows, injected into the README with
 * `<!--- @@inject-table: ./static/dictionaries.json --->`. One row for each dictionary a setting names: the top-level
 * `dictionaries`, each language setting and each override, in the imported dictionaries and in the extension's
 * `cspell`. The values are as the setting writes them; an empty cell is a field the setting doesn't set.
 * @returns `undefined` for a bundle, or when no setting names a dictionary.
 */
async function dictionariesTable(extensionDir: string, config: ExtensionConfig): Promise<string | undefined> {
    if (config.kind === 'bundle') return undefined;
    const exts = [...(await readDictionaries(extensionDir, config)), config.cspell as DictionaryExt];
    const rows = exts.flatMap(settingRows);
    return rows.length ? JSON.stringify(rows, null, 4) + '\n' : undefined;
}

/** The rows of the settings in one `cspell-ext.json`. */
function settingRows(ext: DictionaryExt): Record<string, string>[] {
    return [
        ...(ext.dictionaries ?? []).map((name) => row(name, {})),
        ...(ext.languageSettings ?? []).flatMap((setting) =>
            (setting.dictionaries ?? []).map((name) => row(name, setting)),
        ),
        ...(ext.overrides ?? []).flatMap((override) =>
            (override.dictionaries ?? []).map((name) =>
                row(name, { locale: override.language, languageId: override.languageId, glob: override.filename }),
            ),
        ),
    ];
}

interface Where {
    locale?: string | string[] | undefined;
    languageId?: string | string[] | undefined;
    glob?: string | string[] | undefined;
}

function row(name: string, where: Where): Record<string, string> {
    return {
        Dictionary: code(name),
        locale: asWritten(where.locale),
        languageId: asWritten(where.languageId),
        glob: asWritten(where.glob),
    };
}

/** A setting's value as written: a string, or each item of a list, as code. */
function asWritten(value: string | string[] | undefined): string {
    return [value ?? []].flat().map(code).join(', ');
}

/**
 * The dictionaries in `cspell.import`, and what turns each on: the dictionaries' own settings and the extension's
 * `cspell`.
 */
export async function dictionaryStates(extensionDir: string, config: ExtensionConfig): Promise<DictionaryState[]> {
    const exts = [...(await readDictionaries(extensionDir, config)), config.cspell as DictionaryExt];
    const allRules = rules(exts);
    return exts
        .flatMap((ext) => ext.dictionaryDefinitions ?? [])
        .map(({ name }) => {
            const named = allRules.filter((rule) => rule.dictionaries.includes(name));
            // `*` is every file type: `all` covers it.
            const fileTypes = unique(named.flatMap((rule) => rule.fileTypes)).filter((id) => id !== '*');
            const all = named.some((rule) => !rule.fileTypes.length || rule.fileTypes.includes('*'));
            return { name, all, fileTypes, off: !named.length };
        });
}

/** One setting that turns dictionaries on: for some file types, or for every file. */
interface Rule {
    dictionaries: string[];
    /** Empty, or `*`, for every file type. */
    fileTypes: string[];
}

/** Every setting in the configs that turns dictionaries on, as a flat list of rules. */
function rules(exts: readonly DictionaryExt[]): Rule[] {
    return exts.flatMap((ext) => [dictionariesRule(ext), ...(ext.languageSettings ?? []).map(languageSettingRule)]);
}

/** `dictionaries` turns its dictionaries on for every file. */
function dictionariesRule(ext: DictionaryExt): Rule {
    return { dictionaries: ext.dictionaries ?? [], fileTypes: [] };
}

/** A language setting turns its dictionaries on for its file types. */
function languageSettingRule(setting: LanguageSetting): Rule {
    return {
        dictionaries: setting.dictionaries ?? [],
        fileTypes: splitList(setting.languageId),
    };
}

function splitList(list: string | string[] | undefined): string[] {
    return [list ?? '']
        .flat()
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function code(text: string): string {
    return `\`${text}\``;
}

/** The commands listed in `package.json`, the Command Palette and the README. */
function contributedCommands(config: ExtensionConfig): CommandConfig[] {
    return config.commands.filter((command) => command.contributes ?? true);
}

/**
 * The commands as table rows, injected into the README with `<!--- @@inject-table: ./static/commands.json --->`.
 * @returns `undefined` when the extension has no commands.
 */
function commandsTable(config: ExtensionConfig): string | undefined {
    const commands = contributedCommands(config);
    if (!commands.length) return undefined;
    return (
        JSON.stringify(
            commands.map(({ title }) => ({ Command: title })),
            null,
            4,
        ) + '\n'
    );
}

/**
 * Update the derived fields of an extension's `package.json` and keep the others, in their order.
 */
function packageJsonSource(
    config: ExtensionConfig,
    pkg: PackageJson,
    vscodeEngine: string,
    hasCustom: boolean,
    optionalFiles: string[],
): string {
    const commands = contributedCommands(config).map(({ id, title }) => ({ command: id, title }));
    const contributes = (pkg as { contributes?: object }).contributes;
    const derived: Record<string, unknown> = {
        name: `code-spell-checker-${config.name}`,
        displayName: config.displayName,
        description: config.description,
        type: 'module',
        engines: { ...pkg.engines, vscode: vscodeEngine },
        main: './extension.js',
        // What vsce packages, besides `package.json` and `README.md`. vsce only takes the production dependencies from
        // `node_modules`, wherever npm installed them.
        files: [
            'LICENSE',
            'CHANGELOG.md',
            ...optionalFiles,
            'extension.js',
            ...(pkg.icon ? [pkg.icon] : []),
            cspellExtPath,
            'node_modules/**',
        ],
        contributes: { ...contributes, commands },
        scripts: {
            build: 'tsdown',
            // Only `src/custom.ts` is the extension's own code; the shared code is checked in `extension-runtime/`.
            ...(hasCustom ? { 'check-types': 'tsc -p .' } : {}),
            clean: 'node ../../scripts/clean.mts',
            'clean-build': 'npm run clean && npm run build',
            'pack-extension': 'vsce package',
            'publish-extension': 'vsce publish',
            test: 'npm run test:cspell && npm run test:vscode',
            'test:cspell': `cspell -c ${cspellExtPath} samples`,
            'test:vscode': `node ../../test-runner/bin.mjs . --sample ${config.sample}`,
            'vscode:prepublish': 'npm run build',
            watch: 'tsdown --watch',
        },
    };
    return JSON.stringify({ ...pkg, ...derived }, null, 2) + '\n';
}

/**
 * Fill in a README's `@@inject` sections.
 *
 * It runs from the directory above `extensions/` (the repository root), because inject-markdown only reads files
 * inside that root, and READMEs inject the shared templates in `../../static/`.
 * @returns the README with its `@@inject` sections filled in.
 */
async function injectReadme(readme: string): Promise<string> {
    const cwd = path.resolve(path.dirname(readme), '../..');
    const file = path.relative(cwd, readme);
    const result = await injectMarkdown({ file, content: await fs.readFile(readme, 'utf8') }, { cwd });
    const problems = injectProblems(result);
    if (problems.length) throw new Error(`inject-markdown failed:\n${problems.join('\n')}`);
    return result.document.content;
}
