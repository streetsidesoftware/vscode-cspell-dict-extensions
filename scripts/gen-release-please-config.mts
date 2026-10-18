#!/usr/bin/env node

/**
 * Update the `packages` in `release-please-config.json`: the root and each extension.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { format } from './lib/format.mts';
import { listExtensionRepoPaths, readJson, repoRoot } from './lib/repo.mts';

const configFile = path.join(repoRoot, 'release-please-config.json');

interface PackageConfig {
    component: string;
    releaseType: 'node';
}

async function main(): Promise<void> {
    const repoPaths = ['.', ...(await listExtensionRepoPaths())];

    const packages: Record<string, PackageConfig> = {};
    for (const repoPath of repoPaths) {
        const pkg = await readJson<{ name: string }>(`${repoPath}/package.json`);
        packages[repoPath] = { component: pkg.name, releaseType: 'node' };
    }

    const config = await readJson<Record<string, unknown>>(configFile);
    await fs.writeFile(configFile, await format(configFile, JSON.stringify({ ...config, packages }, null, 4)));
}

await main();
