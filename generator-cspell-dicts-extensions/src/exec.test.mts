import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { findNpmCli, npm } from './exec.mts';

const glob = '**/*.{yaml,json,ts,md}';

describe('npm', () => {
    let dir = '';

    before(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-exec-'));
        // `check` succeeds only when it receives the glob unchanged; `same` only when it receives EXPECTED_ARG.
        const pkg = {
            name: 'exec-test',
            private: true,
            scripts: { check: 'node check.mjs', same: 'node same.mjs' },
        };
        await writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg));
        await writeFile(
            path.join(dir, 'check.mjs'),
            `process.exitCode = process.argv[2] === ${JSON.stringify(glob)} ? 0 : 1;\n`,
        );
        await writeFile(
            path.join(dir, 'same.mjs'),
            'process.exitCode = process.argv[2] === process.env.EXPECTED_ARG ? 0 : 1;\n',
        );
    });

    after(() => rm(dir, { recursive: true, force: true }));

    it('runs npm and passes arguments unchanged', () => {
        assert.doesNotThrow(() => npm(['run', 'check', '--', glob], dir));
    });

    it('finds npm-cli.js, so no shell is needed', () => {
        assert.match(findNpmCli() ?? '', /npm-cli\.c?js$/);
    });

    it('passes shell characters through unchanged', () => {
        const tricky = 'a b & echo injected | x > y';
        process.env['EXPECTED_ARG'] = tricky;
        try {
            assert.doesNotThrow(() => npm(['run', 'same', '--', tricky], dir));
        } finally {
            delete process.env['EXPECTED_ARG'];
        }
    });

    it('throws when the command fails', () => {
        assert.throws(() => npm(['run', 'check', '--', 'other'], dir), /npm run check -- other failed/);
        assert.throws(() => npm(['run', 'missing'], dir), /npm run missing failed/);
    });
});
