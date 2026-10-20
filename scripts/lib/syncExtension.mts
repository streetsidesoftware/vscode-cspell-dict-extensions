/**
 * Sync one extension with `extension-runtime/` and its `extension.config.json`.
 *
 * The sync writes:
 * - the tool configs, copied from `extension-runtime/template/`;
 * - `static/cspell-ext.json`, `static/commands.json` and `static/dictionaries.json`, generated from the config and
 *   the installed dictionaries;
 * - some fields of `package.json`, and the `@@inject` sections of `README.md`.
 *
 * It removes a generated file the extension no longer has. It creates `cspell.config.yaml` when it's missing; after
 * that, the file belongs to the extension. It leaves every other file alone. docs/synced-extensions.md
 * has the details.
 */

import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import { injectMarkdown } from 'inject-markdown';
import { parse as parseJsonc } from 'jsonc-parser';

import {
    cspellExtPath,
    description,
    displayName,
    type ExtensionConfig,
    resolveCommands,
} from '../../extension-runtime/src/config.ts';
import type { PackageJson } from './extensionHelper.mts';
import type { ExtensionConfigValidator } from './extensionSchema.mts';
import { format, injectProblems } from './format.mts';
import { exists, readJson, repoRoot, writeIfChanged } from './repo.mts';

export const configFileName = 'extension.config.json';
const templateDir = path.join(repoRoot, 'extension-runtime/template');
const runtimePackage = '@internal/extension-runtime';

/** Template files whose names can't be used in `extension-runtime/template/`. */
const renamedTemplateFiles: Record<string, string> = {
    gitignore: '.gitignore',
};

/** Files the sync creates when they're missing. After that, they belong to the extension. */
const starterFiles: Record<string, string> = {
    // Lint checks the extension's own files with its dictionaries.
    'cspell.config.yaml': 'import:\n  - ./static/cspell-ext.json\n',
};

export interface SyncOptions {
    /** Only report the files that would change. */
    check?: boolean;
    /** The `engines.vscode` of the root package.json. */
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
    const name = path.basename(extensionDir);
    const configFile = `extensions/${name}/${configFileName}`;
    const config = validate(await readJson(path.join(extensionDir, configFileName)), configFile);
    if (config.name !== name) {
        throw new Error(`${configFile}: "name" must be "${name}", not "${config.name}".`);
    }
    return config;
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
    files.set('package.json', packageJsonSource(config, pkg, vscodeEngine, hasCustom));
    return files;
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
    const unused = ['static/commands.json', 'static/dictionaries.json', 'tsconfig.json'].filter(
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
                    `extensions/${config.name}: the dictionaries need different ${engine} versions ` +
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
}

interface LanguageSetting {
    // cspell takes a comma-separated list or an array.
    languageId?: string | string[];
    locale?: string | string[];
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
            throw new Error(`extensions/${config.name}: can't find "${spec}". Run \`npm install\` first.`);
        }
        // A dictionary's cspell-ext.json may have comments.
        exts.push(parseJsonc(await fs.readFile(file, 'utf8')) as DictionaryExt);
    }
    return exts;
}

/**
 * The dictionaries the extension adds, as table rows, injected into the README with
 * `<!--- @@inject-table: ./static/dictionaries.json --->`. A language lists the locales that turn each dictionary on;
 * the other kinds list the file types, or that a dictionary is off until turned on, i.e. by the extension's commands.
 * @returns `undefined` for a bundle, or when the dictionaries define nothing.
 */
async function dictionariesTable(extensionDir: string, config: ExtensionConfig): Promise<string | undefined> {
    if (config.kind === 'bundle') return undefined;
    const rows: Record<string, string>[] = [];
    const exts = await readDictionaries(extensionDir, config);
    for (const ext of exts) {
        for (const { name } of ext.dictionaryDefinitions ?? []) {
            const { settings, always } = turnedOnBy(name, [...exts, config.cspell as DictionaryExt]);
            const off = !settings.length && !always;
            if (config.kind === 'language') {
                if (off) continue;
                const locales = unique(settings.flatMap((s) => splitList(s.locale)).map(canonicalLocale));
                rows.push({ Dictionary: code(name), Locales: locales.map(code).join(', ') });
            } else {
                const ids = unique(settings.flatMap((s) => splitList(s.languageId)));
                const all = always || !ids.length || ids.includes('*');
                const fileTypes = off ? 'off until turned on' : all ? 'all' : ids.map(code).join(', ');
                rows.push({ Dictionary: code(name), 'File types': fileTypes });
            }
        }
    }
    return rows.length ? JSON.stringify(rows, null, 4) + '\n' : undefined;
}

/**
 * The dictionaries in `cspell.import`, and whether each is off until turned on: neither the dictionaries' own settings
 * nor the extension's `cspell` turn it on. Users turn it on in their settings, or with the extension's commands.
 */
export async function dictionaryStates(
    extensionDir: string,
    config: ExtensionConfig,
): Promise<{ name: string; off: boolean }[]> {
    const exts = await readDictionaries(extensionDir, config);
    return exts
        .flatMap((ext) => ext.dictionaryDefinitions ?? [])
        .map(({ name }) => {
            const { settings, always } = turnedOnBy(name, [...exts, config.cspell as DictionaryExt]);
            return { name, off: !settings.length && !always };
        });
}

/** What turns a dictionary on: the language settings that list it, and whether `dictionaries` does, for every file. */
function turnedOnBy(name: string, exts: DictionaryExt[]): { settings: LanguageSetting[]; always: boolean } {
    return {
        settings: exts.flatMap((ext) => ext.languageSettings ?? []).filter((s) => s.dictionaries?.includes(name)),
        always: exts.some((ext) => ext.dictionaries?.includes(name)),
    };
}

function splitList(list: string | string[] | undefined): string[] {
    return [list ?? '']
        .flat()
        .flatMap((item) => item.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
}

/** A locale as canonical BCP 47 (i.e. `sv_SE` → `sv-SE`), or as written when it isn't a valid tag (i.e. `fr-90`). */
function canonicalLocale(locale: string): string {
    try {
        return Intl.getCanonicalLocales(locale.replaceAll('_', '-'))[0] ?? locale;
    } catch {
        return locale;
    }
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function code(text: string): string {
    return `\`${text}\``;
}

/**
 * The commands as table rows, injected into the README with `<!--- @@inject-table: ./static/commands.json --->`.
 * @returns `undefined` when the extension has no commands.
 */
function commandsTable(config: ExtensionConfig): string | undefined {
    const commands = resolveCommands(config).filter((command) => command.contributes);
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
): string {
    const commands = resolveCommands(config)
        .filter((command) => command.contributes)
        .map(({ id, title }) => ({ command: id, title }));
    const contributes = (pkg as { contributes?: object }).contributes;
    const derived: Record<string, unknown> = {
        name: `code-spell-checker-${config.name}`,
        displayName: displayName(config),
        description: description(config),
        type: 'module',
        engines: { ...pkg.engines, vscode: vscodeEngine },
        main: './out/extension.js',
        contributes: { ...contributes, commands },
        // Each extension bundles the runtime. The dependency lets release-please's node-workspace plugin release every
        // extension when the runtime is released.
        devDependencies: { ...pkg.devDependencies, [runtimePackage]: 'file:../../extension-runtime' },
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
