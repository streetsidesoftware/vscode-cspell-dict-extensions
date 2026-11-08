import path from 'node:path';

import type { InjectMarkdownResult } from 'inject-markdown';

import { repoRoot } from './repo.mts';

/**
 * Format a file the way `prettier` in this repo would.
 * @param repoPath - where the file is in the repository, which picks the prettier options.
 */
export async function format(repoPath: string, content: string): Promise<string> {
    // Loaded here, not at the top: workflows import code that uses this module before `npm ci` installs prettier.
    const prettier = await import('prettier');
    const info = await prettier.getFileInfo(repoPath, { ignorePath: path.join(repoRoot, '.prettierignore') });
    if (info.ignored || !info.inferredParser) return content;
    const options = await prettier.resolveConfig(repoPath, { editorconfig: true });
    return prettier.format(content, { ...options, filepath: repoPath });
}

/**
 * The errors and warnings of an injection, as `file:line: message`.
 *
 * A warning fails too, because the injected content is wrong: an unresolved `{@ name @}` placeholder stays in the text,
 * and a file to inject that doesn't exist becomes an error comment.
 */
export function injectProblems(result: InjectMarkdownResult): string[] {
    const { file } = result.document;
    return [...result.errors, ...result.warnings].map((p) => `${file}:${p.line ?? 0}: ${p.message}`);
}
