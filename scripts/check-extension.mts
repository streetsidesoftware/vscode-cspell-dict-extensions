#!/usr/bin/env node

/**
 * Run the checks an extension must pass: the build, the sample spell check, the sync check, Prettier and the repo's
 * spell check.
 *
 * Usage: `npm run check:extension -- <name…> [--vscode]`
 * - `--vscode`: also run the VS Code test, which downloads VS Code the first time.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';

import { extensionsDir } from '../extension-tools/api.mts';

import { exists, repoRoot } from './lib/repo.mts';

interface Check {
    name: string;
    args: string[];
    cwd: string;
}

function checks(name: string, vscode: boolean): Check[] {
    const dir = path.join(extensionsDir, name);
    const relative = `extensions/${name}`;
    return [
        { name: 'build', args: ['run', 'build'], cwd: dir },
        { name: 'sample spell check', args: ['run', 'test:cspell'], cwd: dir },
        ...(vscode ? [{ name: 'VS Code test', args: ['run', 'test:vscode'], cwd: dir }] : []),
        { name: 'sync check', args: ['run', 'sync:extensions', '--', '--check', name], cwd: repoRoot },
        { name: 'Prettier', args: ['exec', '--', 'prettier', '--check', relative], cwd: repoRoot },
        {
            name: 'spell check',
            args: ['exec', '--', 'cspell', '--no-progress', '--dot', `${relative}/**`],
            cwd: repoRoot,
        },
    ];
}

/** Run npm through Node, without a shell. `npm run` sets `npm_execpath` to npm's own script. */
function npm(args: string[], cwd: string): boolean {
    const npmCli = process.env['npm_execpath'];
    if (!npmCli) throw new Error('Run this with: npm run check:extension -- <name>');
    return spawnSync(process.execPath, [npmCli, ...args], { cwd, stdio: 'inherit' }).status === 0;
}

async function run(): Promise<void> {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { vscode: { type: 'boolean' } } });
    if (!positionals.length) throw new Error('Usage: npm run check:extension -- <name…> [--vscode]');

    const failed: string[] = [];
    for (const name of positionals) {
        if (!(await exists(path.join(extensionsDir, name, 'extension.config.json')))) {
            throw new Error(`extensions/${name}/extension.config.json not found.`);
        }
        for (const check of checks(name, !!values.vscode)) {
            console.log(styleText('bold', `\n${name}: ${check.name}`));
            if (!npm(check.args, check.cwd)) failed.push(`${name}: ${check.name}`);
        }
    }

    if (failed.length) {
        console.error(
            styleText('red', `\nFailed:\n${failed.map((f) => `- ${f}`).join('\n')}`, { stream: process.stderr }),
        );
        process.exitCode = 1;
    } else {
        console.log(styleText('green', '\nAll checks passed.'));
    }
}

try {
    await run();
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
}
