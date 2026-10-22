import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const extensionRoot = new URL('../../extensions/spanish/', import.meta.url);
const expectedDescription = 'Spanish dictionary extension for VS Code.';

describe('Spanish extension description', () => {
    it('uses the documented description in its config, package and README', async () => {
        const config = JSON.parse(await readFile(new URL('extension.config.json', extensionRoot), 'utf8'));
        const packageJson = JSON.parse(await readFile(new URL('package.json', extensionRoot), 'utf8'));
        const readme = await readFile(new URL('README.md', extensionRoot), 'utf8');

        assert.equal(config.description, expectedDescription);
        assert.equal(packageJson.description, expectedDescription);
        assert.ok(readme.split(/\r?\n/).includes(expectedDescription));
    });
});
