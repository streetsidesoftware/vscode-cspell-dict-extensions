/**
 * Write the files of an extension that come from `extension-runtime/` or from its `extension.config.json`.
 *
 * - Owned: the tool configs copied from `extension-runtime/template/`.
 * - Generated into `static/`: `cspell-ext.json` and the README fragments.
 * - Derived: some fields of `package.json` (the other fields are kept) and the injected sections of `README.md`.
 * - Everything else (the rest of the README, samples, CHANGELOG, LICENSE, images, `src/custom.ts`) is never touched.
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import * as prettier from 'prettier';

import {
    cspellExtPath,
    description,
    displayName,
    type ExtensionConfig,
    parseExtensionConfig,
    resolveCommands,
} from '../../extension-runtime/src/config.ts';
import type { PackageJson } from './extensionHelper.mts';

export const repoRoot: string = path.resolve(import.meta.dirname, '../..');
export const configFileName = 'extension.config.json';
const templateDir = path.join(repoRoot, 'extension-runtime/template');
const injectMarkdownBin = path.join(repoRoot, 'node_modules/inject-markdown/bin.mjs');
const codeSpellCheckerUrl = 'https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker';

/** Template files whose names can't be used in `extension-runtime/template/`. */
const renamedTemplateFiles: Record<string, string> = {
    gitignore: '.gitignore',
};

/** Files from before the sync, replaced by the shared entry and `static/cspell-ext.json`. */
const obsoleteFiles = ['src/extension.ts', 'cspell-ext.json'];

export interface SyncOptions {
    /** Only report the files that would change. */
    check?: boolean;
    /** The `engines.vscode` of the root package.json. */
    vscodeEngine: string;
    /** The default minimum versions, from `static/engines.json`. */
    engines: Record<string, string>;
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
    const config = parseExtensionConfig(await readJson(path.join(extensionDir, configFileName)));
    if (config.name !== name) {
        throw new Error(`extensions/${name}/${configFileName}: "name" must be "${name}", not "${config.name}".`);
    }

    const engines = { ...options.engines, ...config.engines };
    const hasCustom = await exists(path.join(extensionDir, 'src/custom.ts'));
    const files = new Map<string, string>(await readTemplateFiles());
    files.set(cspellExtPath, JSON.stringify({ ...config.cspell, engines }, null, 4) + '\n');
    files.set('static/requirements.md', requirementsMarkdown(engines));
    const commandsMd = commandsMarkdown(config);
    if (commandsMd) files.set('static/commands.md', commandsMd);
    const pkg = (await readJson(path.join(extensionDir, 'package.json'))) as PackageJson;
    files.set('package.json', packageJsonSource(config, pkg, options.vscodeEngine, hasCustom));

    const changes: FileChange[] = [];
    for (const [file, content] of files) {
        const formatted = await format(path.join(repoRoot, 'extensions', name, file), content);
        if (await writeIfChanged(path.join(extensionDir, file), formatted, options.check)) {
            changes.push({ file, action: 'update' });
        }
    }

    const remove = commandsMd ? obsoleteFiles : [...obsoleteFiles, 'static/commands.md'];
    for (const file of remove) {
        const target = path.join(extensionDir, file);
        if (!(await exists(target))) continue;
        changes.push({ file, action: 'remove' });
        if (!options.check) await fs.rm(target);
    }

    const readme = path.join(extensionDir, 'README.md');
    if (await exists(readme)) {
        const injected = await format(path.join(repoRoot, 'extensions', name, 'README.md'), await injectReadme(readme));
        if (await writeIfChanged(readme, injected, options.check))
            changes.push({ file: 'README.md', action: 'update' });
    }

    return changes;
}

/**
 * The list of commands, injected into the README with `<!--- @@inject: ./static/commands.md --->`.
 * @returns `undefined` when the extension has no commands.
 */
export function commandsMarkdown(config: ExtensionConfig): string | undefined {
    const commands = resolveCommands(config);
    if (!commands.length) return undefined;
    return commands.map(({ title }) => `- \`${title}\``).join('\n') + '\n';
}

/**
 * The README requirements section, injected with `<!--- @@inject: ./static/requirements.md --->`.
 */
export function requirementsMarkdown(engines: Record<string, string>): string {
    const tools: Record<string, string> = {
        'code-spell-checker': `[Code Spell Checker](${codeSpellCheckerUrl})`,
        cspell: '[cspell](https://github.com/streetsidesoftware/cspell)',
    };
    const rows = Object.entries(engines).map(([engine, version]) => `| ${tools[engine] ?? engine} | \`${version}\` |`);
    return [
        '## Requirements',
        '',
        `This extension will automatically include the [Code Spell Checker](${codeSpellCheckerUrl}) extension.`,
        '',
        '| Tool | Version |',
        '| ---- | ------- |',
        ...rows,
        '',
    ].join('\n');
}

/**
 * Run `inject-markdown` on a README without changing it.
 *
 * It runs from the directory above `extensions/` (the repository root), because inject-markdown only reads files
 * inside its working directory, and READMEs inject `../../static/footer.md`.
 * @returns the README with its `@@inject` sections filled in.
 */
async function injectReadme(readme: string): Promise<string> {
    const root = path.resolve(path.dirname(readme), '../..');
    const relative = path.relative(root, readme);
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-readme-'));
    try {
        await promisify(execFile)(
            process.execPath,
            [injectMarkdownBin, '--silent', '--no-summary', '--output-dir', outDir, relative],
            { cwd: root },
        );
        return await fs.readFile(path.join(outDir, relative), 'utf8');
    } finally {
        await fs.rm(outDir, { recursive: true, force: true });
    }
}

async function writeIfChanged(target: string, content: string, check: boolean | undefined): Promise<boolean> {
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
async function format(repoPath: string, content: string): Promise<string> {
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
