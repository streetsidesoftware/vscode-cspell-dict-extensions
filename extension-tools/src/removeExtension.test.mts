import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { removeExtension } from './removeExtension.mts';

describe('removeExtension', () => {
    it('refuses a released extension', async () => {
        // A directory that doesn't exist: if the check failed, `rm` would fail too, and delete nothing.
        const extension = { folder: 'swedish', dir: path.join(import.meta.dirname, 'no-such-dir') };
        await assert.rejects(removeExtension(extension), /extensions\/swedish has been released/);
    });
});
