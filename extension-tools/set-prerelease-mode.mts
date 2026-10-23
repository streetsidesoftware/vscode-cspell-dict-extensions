#!/usr/bin/env node

/**
 * Turn an extension's pre-release mode on or off.
 *
 * Usage: `set-prerelease-mode.mts <folder> <true|false>`
 *
 * While `vsce.preRelease` is `true` in an extension's `package.json`, `vsce` publishes every release of it
 * as a pre-release.
 *
 * Only `node:` modules: a workflow runs it before `npm ci`.
 */

import { setPreRelease } from './src/preRelease.mts';

async function run(): Promise<void> {
    const [folder, mode, ...rest] = process.argv.slice(2);
    if (!folder || !/^[a-z0-9-]+$/.test(folder) || !(mode === 'true' || mode === 'false') || rest.length) {
        console.error('Usage: set-prerelease-mode.mts <folder> <true|false>');
        process.exitCode = 1;
        return;
    }

    const repoPath = `extensions/${folder}`;
    const preRelease = mode === 'true';
    const changed = await setPreRelease(repoPath, preRelease);
    console.log(`${repoPath}: pre-release mode is ${changed ? 'now' : 'already'} ${preRelease}.`);
}

await run();
