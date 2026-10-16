/**
 * Write the files of an extension that come from `extension-runtime/` or from its `extension.config.json`.
 *
 * - Owned: the tool configs copied from `extension-runtime/template/`.
 * - Generated into `static/`: `cspell-ext.json` and `commands.json`, the data the README templates read.
 * - Derived: some fields of `package.json` (the other fields are kept) and the injected sections of `README.md`,
 *   filled from the shared templates in `<repo>/static/` and the extension's `static/` data.
 * - Everything else (the rest of the README, samples, CHANGELOG, LICENSE, images, `src/custom.ts`) is never touched.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { injectMarkdown } from 'inject-markdown';
import * as prettier from 'prettier';

import {
    cspellExtPath,
    description,
    displayName,
    type ExtensionConfig,
    resolveCommands,
} from '../../extension-runtime/src/config.ts';
import type { PackageJson } from './extensionHelper.mts';
import type { ExtensionConfigValidator } from './extensionSchema.mts';

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');
export const configFileName = 'extension.config.json';
const templateDir = path.join(repoRoot, 'extension-runtime/template');

/** Template files whose names can't be used in `extension-runtime/template/`. */
const renamedTemplateFiles: Record<string, string> = {
    gitignore: '.gitignore',
};

/** Files replaced by the shared entry, `static/cspell-ext.json` and the shared README templates. */
const obsoleteFiles = ['src/extension.ts', 'cspell-ext.json', 'static/commands.md', 'static/requirements.md'];

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
    action: 'update' | 'remove';
}

/**
 * Sync one extension.
 * @param extensionDir - the extension's directory.
 * @returns the files that changed (or would change with `check`).
 */
export async function syncExtension(extensionDir: string, options: SyncOptions): Promise<FileChange[]> {
    const name = path.basename(extensionDir);
    const configFile = `extensions/${name}/${configFileName}`;
    const config = options.validate(await readJson(path.join(extensionDir, configFileName)), configFile);
    if (config.name !== name) {
        throw new Error(`${configFile}: "name" must be "${name}", not "${config.name}".`);
    }

    const hasCustom = await exists(path.join(extensionDir, 'src/custom.ts'));
    const files = new Map<string, string>(await readTemplateFiles());
    files.set(cspellExtPath, JSON.stringify(config.cspell, null, 4) + '\n');
    const commands = commandsTable(config);
    if (commands) files.set('static/commands.json', commands);
    const pkg = (await readJson(path.join(extensionDir, 'package.json'))) as PackageJson;
    files.set('package.json', packageJsonSource(config, pkg, options.vscodeEngine, hasCustom));

    const changes: FileChange[] = [];
    for (const [file, content] of files) {
        const formatted = await format(path.join(repoRoot, 'extensions', name, file), content);
        if (await writeIfChanged(path.join(extensionDir, file), formatted, options.check)) {
            changes.push({ file, action: 'update' });
        }
    }

    const remove = commands ? obsoleteFiles : [...obsoleteFiles, 'static/commands.json'];
    for (const file of remove) {
        const target = path.join(extensionDir, file);
        if (!(await exists(target))) continue;
        changes.push({ file, action: 'remove' });
        if (!options.check) await fs.rm(target);
    }

    // The README is filled from the files in `static/`. With `check`, they aren't written, so when they're out of
    // date the README can't be checked yet; the check fails on them anyway.
    const readme = path.join(extensionDir, 'README.md');
    if ((await exists(readme)) && !(options.check && changes.length)) {
        const injected = await format(path.join(repoRoot, 'extensions', name, 'README.md'), await injectReadme(readme));
        if (await writeIfChanged(readme, injected, options.check))
            changes.push({ file: 'README.md', action: 'update' });
    }

    return changes;
}

/**
 * The commands as table rows, injected into the README with `<!--- @@inject-table: ./static/commands.json --->`.
 * @returns `undefined` when the extension has no commands.
 */
export function commandsTable(config: ExtensionConfig): string | undefined {
    const commands = resolveCommands(config);
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
    if (result.errors.length) {
        const messages = result.errors.map((e) => `${file}:${e.line ?? 0}: ${e.message}`);
        throw new Error(`inject-markdown failed:\n${messages.join('\n')}`);
    }
    return result.document.content;
}

export async function writeIfChanged(target: string, content: string, check: boolean | undefined): Promise<boolean> {
    if ((await readText(target)) === content) return false;
    if (!check) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content);
    }
    return true;
}

/**
 * Update the derived fields of an extension's `package.json` and keep the others, in their order.
 */
export function packageJsonSource(
    config: ExtensionConfig,
    pkg: PackageJson,
    vscodeEngine: string,
    hasCustom: boolean,
): string {
    const commands = resolveCommands(config).map(({ id, title }) => ({ command: id, title }));
    const contributes = (pkg as { contributes?: object }).contributes;
    const derived: Record<string, unknown> = {
        name: `code-spell-checker-${config.name}`,
        displayName: displayName(config),
        description: description(config),
        type: 'module',
        engines: { ...pkg.engines, vscode: vscodeEngine },
        main: './out/extension.js',
        contributes: { ...contributes, commands },
        scripts: {
            build: 'tsdown',
            // Only `src/custom.ts` is the extension's own code; the shared code is checked in `extension-runtime/`.
            ...(hasCustom ? { 'check-types': 'tsc -p .' } : {}),
            clean: 'rimraf out',
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
 * Format a file the way `prettier` in this repo would.
 * @param repoPath - where the file is in the repository, which picks the prettier options.
 */
export async function format(repoPath: string, content: string): Promise<string> {
    const info = await prettier.getFileInfo(repoPath, { ignorePath: path.join(repoRoot, '.prettierignore') });
    if (info.ignored || !info.inferredParser) return content;
    const options = await prettier.resolveConfig(repoPath, { editorconfig: true });
    return prettier.format(content, { ...options, filepath: repoPath });
}

async function readJson(file: string): Promise<unknown> {
    return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readText(file: string): Promise<string | undefined> {
    try {
        return await fs.readFile(file, 'utf8');
    } catch {
        return undefined;
    }
}

async function exists(file: string): Promise<boolean> {
    return (await readText(file)) !== undefined;
}
