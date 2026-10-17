#!/usr/bin/env node

/**
 * Update the `packages` in `release-please-config.json`: the root and each extension.
 */

import { listExtensionDirs, readJson, run, writeJson } from './lib/repo.mts';

const configFile = 'release-please-config.json';

interface PackageConfig {
    component: string;
    releaseType: 'node';
}

async function main(): Promise<void> {
    const dirs = ['.', ...(await listExtensionDirs())];

    const packages: Record<string, PackageConfig> = {};
    for (const dir of dirs) {
        const pkg = await readJson<{ name: string }>(`${dir}/package.json`);
        packages[dir] = { component: pkg.name, releaseType: 'node' };
    }

    const config = await readJson<Record<string, unknown>>(configFile);
    await writeJson(configFile, { ...config, packages });

    run('npx', ['prettier', '-w', configFile]);
}

await main();
