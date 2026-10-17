/**
 * Format files with the prettier API and fill in `@@inject` sections with the inject-markdown API.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { injectMarkdown, type InjectMarkdownResult } from 'inject-markdown';
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
 *
 * Unlike the command, a warning (an unresolved `{@ name @}` placeholder, a file to inject that doesn't exist) fails
 * too. All the files are checked first; the ones without problems are written, then it fails with every problem.
 * @param patterns - globs relative to the repository root.
 */
export async function injectFiles(...patterns: string[]): Promise<void> {
    const problems: string[] = [];
    for await (const file of fs.glob(patterns, { cwd: repoRoot })) {
        const repoPath = path.join(repoRoot, file);
        const result = await injectMarkdown({ file, content: await fs.readFile(repoPath, 'utf8') }, { cwd: repoRoot });
        const fileProblems = injectProblems(result);
        problems.push(...fileProblems);
        if (result.updated && !fileProblems.length) await fs.writeFile(repoPath, result.document.content);
    }
    if (problems.length) throw new Error(`inject-markdown failed:\n${problems.join('\n')}`);
}

/**
 * The errors and warnings of an injection, as `file:line: message`. Warnings count, because the injected content is
 * wrong: an unresolved placeholder stays in the text, and a missing file becomes an error comment.
 */
export function injectProblems(result: InjectMarkdownResult): string[] {
    const { file } = result.document;
    return [...result.errors, ...result.warnings].map((p) => `${file}:${p.line ?? 0}: ${p.message}`);
}
