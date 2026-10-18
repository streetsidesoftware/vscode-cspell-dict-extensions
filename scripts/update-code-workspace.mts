#!/usr/bin/env node

/**
 * Update the folders in `dict-extensions.code-workspace`, the generated extension lists and the READMEs, and fix
 * the extensions' `package.json` files.
 */

import { fixExtensions } from './fix-extensions.mts';
import { genExtensionList } from './gen-extension-list.mts';
import { formatFiles, injectFiles } from './lib/format.mts';
import { listExtensionRepoPaths, readJson, writeJson } from './lib/repo.mts';
import type { CodeWorkspace } from './lib/types.ts';

const workspaceFile = 'dict-extensions.code-workspace';

async function updateCodeWorkspace(): Promise<void> {
    const repoPaths = ['.', 'test-runner', 'generator-cspell-dicts-extensions', ...(await listExtensionRepoPaths())];
    const folders = repoPaths.sort().map((repoPath) => ({ path: repoPath }));

    const workspace = await readJson<CodeWorkspace>(workspaceFile);
    await writeJson(workspaceFile, { ...workspace, folders });
}

async function main(): Promise<void> {
    await updateCodeWorkspace();

    // Update README.md
    await genExtensionList();
    await fixExtensions();

    await formatFiles('static/generated/*.md');
    await injectFiles('README.md', 'extensions/*/README.md');
    await formatFiles('README.md', 'extensions/*/README.md');
}

await main();
