import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { exec } from './exec.mts';

const glob = '**/*.{yaml,json,ts,md}';

describe('exec', () => {
    let dir = '';

    before(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-exec-'));
        // `check` succeeds only when it receives the glob unchanged.
        const pkg = { name: 'exec-test', private: true, scripts: { check: 'node check.mjs' } };
        await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg));
        await writeFile(
            path.join(dir, 'check.mjs'),
            `process.exitCode = process.argv[2] === ${JSON.stringify(glob)} ? 0 : 1;\n`,
        );
    });

    after(() => rm(dir, { recursive: true, force: true }));

    it('runs npm and passes arguments unchanged', () => {
        assert.doesNotThrow(() => exec('npm', ['run', 'check', '--', glob], dir));
    });

    it('throws when the command fails', () => {
        assert.throws(() => exec('npm', ['run', 'check', '--', 'other'], dir), /npm run check -- other failed/);
        assert.throws(() => exec('npm', ['run', 'missing'], dir), /npm run missing failed/);
    });
});
