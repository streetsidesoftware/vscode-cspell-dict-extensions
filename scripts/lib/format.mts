/**
 * Format files with the prettier API and fill in `@@inject` sections with the inject-markdown API.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { injectFile } from 'inject-markdown';
import * as prettier from 'prettier';

import { repoRoot } from './repo.mts';

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

/**
 * Format files in place, like `prettier -w`.
 * @param patterns - globs relative to the repository root.
 */
export async function formatFiles(...patterns: string[]): Promise<void> {
    for await (const file of fs.glob(patterns, { cwd: repoRoot })) {
        const repoPath = path.join(repoRoot, file);
        const content = await fs.readFile(repoPath, 'utf8');
        const formatted = await format(repoPath, content);
        if (formatted !== content) await fs.writeFile(repoPath, formatted);
    }
}

/**
 * Fill in the `@@inject` sections of Markdown files in place, like the `inject-markdown` command.
 * @param patterns - globs relative to the repository root.
 */
export async function injectFiles(...patterns: string[]): Promise<void> {
    for await (const file of fs.glob(patterns, { cwd: repoRoot })) {
        const result = await injectFile(file, { cwd: repoRoot });
        if (result.errors.length) {
            const messages = result.errors.map((e) => `${file}:${e.line ?? 0}: ${e.message}`);
            throw new Error(`inject-markdown failed:\n${messages.join('\n')}`);
        }
    }
}
