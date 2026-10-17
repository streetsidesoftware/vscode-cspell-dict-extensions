#!/usr/bin/env node

/**
 * Update the folders in `dict-extensions.code-workspace`, the generated extension lists and the READMEs, and fix
 * the extensions' `package.json` files.
 */

import path from 'node:path';

import type { CodeWorkspace } from './lib/types.ts';
import { listExtensionDirs, readJson, repoRoot, run, writeJson } from './lib/repo.mts';

const workspaceFile = 'dict-extensions.code-workspace';

async function updateCodeWorkspace(): Promise<void> {
    const dirs = ['.', 'test-runner', 'generator-cspell-dicts-extensions', ...(await listExtensionDirs())];
    const folders = dirs.sort().map((dir) => ({ path: dir }));

    const workspace = await readJson<CodeWorkspace>(workspaceFile);
    await writeJson(workspaceFile, { ...workspace, folders });
}

async function main(): Promise<void> {
    await updateCodeWorkspace();

    // Update README.md
    run(process.execPath, [path.join(repoRoot, 'scripts/gen-extension-list.mts')]);
    run(process.execPath, [path.join(repoRoot, 'scripts/fix-extensions.mts')]);

    run('npx', ['prettier', '-w', 'static/generated/*.md']);
    run('npx', ['inject-markdown', 'README.md', 'extensions/*/README.md']);
    run('npx', ['prettier', '-w', 'README.md', 'extensions/*/README.md']);
}

await main();
