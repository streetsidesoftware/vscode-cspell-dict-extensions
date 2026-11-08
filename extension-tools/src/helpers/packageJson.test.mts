import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { writePackageJson } from './packageJson.mts';

describe('writePackageJson', () => {
    let dir = '';

    before(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-package-json-'));
    });

    after(async () => {
        await rm(dir, { recursive: true, force: true });
    });

    it('writes the fields in a fixed order', async () => {
        await writePackageJson(dir, {
            version: '1.0.0',
            vsce: { preRelease: true },
            name: 'x',
            private: true,
        });
        const text = await readFile(path.join(dir, 'package.json'), 'utf8');
        assert.deepEqual(Object.keys(JSON.parse(text)), ['name', 'version', 'private', 'vsce']);
        assert.ok(text.startsWith('{\n  "name": "x",\n'));
    });

    it('writes unlisted fields last, in alphabetical order', async () => {
        await writePackageJson(dir, { zebra: 1, name: 'x', allowScripts: {}, version: '1.0.0' });
        const text = await readFile(path.join(dir, 'package.json'), 'utf8');
        assert.deepEqual(Object.keys(JSON.parse(text)), ['name', 'version', 'allowScripts', 'zebra']);
    });
});
