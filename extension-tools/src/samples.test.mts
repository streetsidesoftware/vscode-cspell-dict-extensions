import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { addSampleFiles, listSamples, removeSample } from './samples.mts';

describe('samples', () => {
    let dir = '';
    const config = { sample: 'samples/test.md' } as ExtensionConfig;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'samples-'));
        await fs.mkdir(path.join(dir, 'samples/sub'), { recursive: true });
        await fs.writeFile(path.join(dir, 'samples/test.md'), 'test\n');
        await fs.writeFile(path.join(dir, 'samples/sub/b.md'), 'b\n');
        await fs.writeFile(path.join(dir, 'samples/cspell.json'), '{}\n');
        await fs.writeFile(path.join(dir, 'new.md'), 'new\n');
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it('lists the samples, without their config', async () => {
        assert.deepEqual(await listSamples(dir), ['samples/sub/b.md', 'samples/test.md']);
    });

    it('copies a file in, and refuses one that is there', async () => {
        assert.deepEqual(await addSampleFiles(dir, ['new.md'], dir), ['samples/new.md']);
        await assert.rejects(addSampleFiles(dir, ['new.md'], dir), /samples\/new.md already exists/);
        await assert.rejects(addSampleFiles(dir, ['samples/cspell.json'], dir), /the samples' config/);
    });

    it('removes a sample, but not the test sample', async () => {
        await removeSample(dir, config, 'samples/sub/b.md');
        assert.deepEqual(await listSamples(dir), ['samples/test.md']);
        await assert.rejects(removeSample(dir, config, 'samples/test.md'), /is the test sample/);
        await assert.rejects(removeSample(dir, config, 'samples/nope.md'), /isn't a sample/);
    });
});
