import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { findExistingExtensions } from './existingExtensions.mts';

describe('findExistingExtensions', () => {
    let dir = '';

    before(async () => {
        dir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-ext-existing-'));
        const add = async (name: string, cspell?: unknown) => {
            await mkdir(path.join(dir, name));
            if (cspell)
                await writeFile(path.join(dir, name, 'extension.config.json'), JSON.stringify({ name, cspell }));
        };
        await add('swedish', { import: ['@cspell/dict-sv/cspell-ext.json'] });
        await add('typescript-parser', { import: ['@cspell/parser-typescript/recommended'] });
        await add('bundled', { import: ['@cspell/cspell-bundled-dicts/cspell-default.json'] });
        await add('no-config');
    });

    after(() => rm(dir, { recursive: true, force: true }));

    it('maps each imported package to its extension', async () => {
        assert.deepEqual(
            await findExistingExtensions(dir),
            new Map([
                ['@cspell/dict-sv', 'swedish'],
                ['@cspell/parser-typescript', 'typescript-parser'],
            ]),
        );
    });

    it('returns nothing for a missing directory', async () => {
        assert.equal((await findExistingExtensions(path.join(dir, 'missing'))).size, 0);
    });
});
