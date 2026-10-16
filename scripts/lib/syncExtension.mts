/**
 * Write the files of an extension that come from `extension-runtime/` or from its `extension.config.json`.
 *
 * - Owned: copied from `extension-runtime/template/`, plus the shared entry `src/extension.ts`.
 * - Derived: `cspell-ext.json` and some fields of `package.json`. The other fields are kept.
 * - Everything else (README, samples, CHANGELOG, LICENSE, images, `src/custom.ts`) is never touched.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as prettier from 'prettier';

import {
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

/** Template files whose names can't be used in `extension-runtime/template/`. */
const renamedTemplateFiles: Record<string, string> = {
    gitignore: '.gitignore',
};

export interface SyncOptions {
    /** Only report the files that would change. */
    check?: boolean;
    /** The `engines.vscode` of the root package.json. */
    vscodeEngine: string;
}

/**
 * Sync one extension.
 * @param extensionDir - the extension's directory.
 * @returns the paths, relative to the extension, of the files that changed (or would change with `check`).
 */
export async function syncExtension(extensionDir: string, options: SyncOptions): Promise<string[]> {
    const name = path.basename(extensionDir);
    const config = parseExtensionConfig(await readJson(path.join(extensionDir, configFileName)));
    if (config.name !== name) {
        throw new Error(`extensions/${name}/${configFileName}: "name" must be "${name}", not "${config.name}".`);
    }

    const files = new Map<string, string>(await readTemplateFiles());
    const hasCustom = await exists(path.join(extensionDir, 'src/custom.ts'));
    files.set('src/extension.ts', entrySource(hasCustom));
    files.set('cspell-ext.json', JSON.stringify(config.cspell, null, 4) + '\n');
    const pkg = (await readJson(path.join(extensionDir, 'package.json'))) as PackageJson;
    files.set('package.json', packageJsonSource(config, pkg, options.vscodeEngine));

    const changed: string[] = [];
    for (const [file, content] of files) {
        const formatted = await format(path.join(repoRoot, 'extensions', name, file), content);
        const target = path.join(extensionDir, file);
        if ((await readText(target)) === formatted) continue;
        changed.push(file);
        if (!options.check) {
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.writeFile(target, formatted);
        }
    }
    return changed;
}

/**
 * The shared entry point of every extension.
 * @param hasCustom - the extension has a `src/custom.ts` to activate.
 */
export function entrySource(hasCustom: boolean): string {
    const lines = [
        '// Written by `npm run sync:extensions`. Do not edit: put custom code in `src/custom.ts`.',
        "import type { ExtensionContext } from 'vscode';",
        '',
        "import { activateExtension } from '../../../extension-runtime/src/activate.ts';",
        "import config from '../extension.config.json' with { type: 'json' };",
        ...(hasCustom ? ["import * as custom from './custom.ts';"] : []),
        '',
        '/** Called by VS Code when the extension is loaded. It must return right away: see `activateExtension`. */',
        'export function activate(context: ExtensionContext): void {',
        `    activateExtension(context, config${hasCustom ? ', custom' : ''});`,
        '}',
        '',
        'export function deactivate(): void {}',
        '',
    ];
    return lines.join('\n');
}

/**
 * Update the derived fields of an extension's `package.json` and keep the others, in their order.
 */
export function packageJsonSource(config: ExtensionConfig, pkg: PackageJson, vscodeEngine: string): string {
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
            'check-types': 'tsc -p .',
            clean: 'rimraf out',
            'clean-build': 'npm run clean && npm run build',
            'pack-extension': 'vsce package',
            'publish-extension': 'vsce publish',
            test: 'npm run test:cspell && npm run test:vscode',
            'test:cspell': 'cspell -c cspell-ext.json samples',
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
