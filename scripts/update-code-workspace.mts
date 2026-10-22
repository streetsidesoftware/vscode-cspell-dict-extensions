#!/usr/bin/env node

/**
 * Update the folders in `dict-extensions.code-workspace`, the generated extension lists, the READMEs and the docs.
 */

import { listExtensionRepoPaths } from '../extension-tools/api.mts';

import { genExtensionList } from './gen-extension-list.mts';
import { formatFiles, injectFiles } from './lib/format.mts';
import { readJson, writeJson } from './lib/repo.mts';
import type { CodeWorkspace } from './lib/types.ts';

const workspaceFile = 'dict-extensions.code-workspace';

async function updateCodeWorkspace(): Promise<void> {
    const repoPaths = ['.', 'test-runner', 'extension-tools', ...(await listExtensionRepoPaths())];
    const folders = repoPaths.sort().map((repoPath) => ({ path: repoPath }));

    const workspace = await readJson<CodeWorkspace>(workspaceFile);
    await writeJson(workspaceFile, { ...workspace, folders });
}

async function main(): Promise<void> {
    await updateCodeWorkspace();

    // Update README.md
    await genExtensionList();

    await formatFiles('static/generated/*.md');
    const docs = ['CONTRIBUTING.md', 'docs/**/*.md', 'extension-tools/README.md'];
    await injectFiles('README.md', 'extensions/*/README.md', ...docs);
    await formatFiles('README.md', 'extensions/*/README.md', ...docs);
}

await main();
