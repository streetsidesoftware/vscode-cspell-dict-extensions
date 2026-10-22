import fs from 'node:fs/promises';

import type { Extension } from './extensionConfig.mts';
import { readJson } from './repo.mts';

const manifest = '.release-please-manifest.json';

/**
 * Delete an extension's folder. Only an extension that was never released: retiring a published one is a separate
 * decision.
 */
export async function removeExtension({ folder, dir }: Extension): Promise<void> {
    const released = await readJson<Record<string, string>>(manifest);
    if (released[`extensions/${folder}`] !== undefined) {
        throw new Error(`extensions/${folder} has been released (it's in ${manifest}), so it can't be removed.`);
    }
    await fs.rm(dir, { recursive: true });
}
