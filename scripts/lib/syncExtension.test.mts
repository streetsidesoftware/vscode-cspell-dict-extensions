import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { entrySource, syncExtension } from './syncExtension.mts';

const config = {
    name: 'demo',
    friendlyName: 'Demo',
    sample: 'samples/demo.md',
    cspell: { import: ['@cspell/dict-demo/cspell-ext.json'] },
    commands: [
        { action: 'enable', toggle: 'locale', value: 'xx' },
        { action: 'disable', toggle: 'dictionary', value: 'demo', scope: 'workspace' },
    ],
};

const pkg = {
    name: 'old-name',
    version: '1.2.3',
    type: 'commonjs',
    contributes: { languages: [] },
    scripts: { build: 'tsc -p ./', extra: 'echo' },
    dependencies: { '@cspell/dict-demo': '^1.0.0' },
};

const options = { vscodeEngine: '^1.125.0' };

describe('syncExtension', () => {
    let dir = '';

    beforeEach(async () => {
        dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'sync-')), 'demo');
        await fs.mkdir(dir);
        await writeJson('extension.config.json', config);
        await writeJson('package.json', pkg);
        await fs.writeFile(path.join(dir, 'README.md'), 'hand-written');
    });

    afterEach(async () => {
        await fs.rm(path.dirname(dir), { recursive: true, force: true });
    });

    it('writes the owned and derived files', async () => {
        const changed = await syncExtension(dir, options);
        assert.deepEqual(changed.toSorted(), [
            '.gitignore',
            '.vscode/launch.json',
            '.vscode/tasks.json',
            '.vscodeignore',
            'cspell-ext.json',
            'package.json',
            'src/extension.ts',
            'tsconfig.json',
            'tsdown.config.ts',
        ]);
        assert.equal(await read('README.md'), 'hand-written');
        assert.deepEqual(JSON.parse(await read('cspell-ext.json')), config.cspell);
        assert.equal(await read('src/extension.ts'), entrySource(false));
    });

    it('derives package.json fields and keeps the others in order', async () => {
        await syncExtension(dir, options);
        const result = JSON.parse(await read('package.json'));
        assert.equal(result.name, 'code-spell-checker-demo');
        assert.equal(result.displayName, 'Demo - Code Spell Checker');
        assert.equal(result.version, '1.2.3');
        assert.equal(result.type, 'module');
        assert.equal(result.main, './out/extension.js');
        assert.deepEqual(result.engines, { vscode: '^1.125.0' });
        assert.deepEqual(result.contributes, {
            languages: [],
            commands: [
                { command: 'cSpellExt_demo.enable', title: 'Enable Demo Spell Checker Dictionary' },
                {
                    command: 'cSpellExt_demo.disableWorkspace',
                    title: 'Disable Demo Spell Checker Dictionary in Workspace',
                },
            ],
        });
        assert.equal(result.scripts.build, 'tsdown');
        assert.equal(result.scripts['test:vscode'], 'node ../../test-runner/bin.mjs . --sample samples/demo.md');
        assert.equal(result.scripts.extra, undefined);
        assert.deepEqual(result.dependencies, pkg.dependencies);
        assert.deepEqual(Object.keys(result).slice(0, 5), ['name', 'version', 'type', 'contributes', 'scripts']);
    });

    it('changes nothing the second time', async () => {
        await syncExtension(dir, options);
        assert.deepEqual(await syncExtension(dir, { ...options, check: true }), []);
    });

    it('only reports with check', async () => {
        const changed = await syncExtension(dir, { ...options, check: true });
        assert.ok(changed.includes('package.json'));
        assert.equal(JSON.parse(await read('package.json')).name, 'old-name');
    });

    it('activates src/custom.ts when there is one', async () => {
        await fs.mkdir(path.join(dir, 'src'));
        await fs.writeFile(path.join(dir, 'src/custom.ts'), 'export {};\n');
        await syncExtension(dir, options);
        assert.equal(await read('src/extension.ts'), entrySource(true));
        assert.match(entrySource(true), /activateExtension\(context, config, custom\)/);
        assert.equal(await read('src/custom.ts'), 'export {};\n');
    });

    it('rejects a name that is not the directory', async () => {
        await writeJson('extension.config.json', { ...config, name: 'other' });
        await assert.rejects(syncExtension(dir, options), /"name" must be "demo"/);
    });

    async function writeJson(file: string, data: unknown): Promise<void> {
        await fs.writeFile(path.join(dir, file), JSON.stringify(data, null, 2) + '\n');
    }

    async function read(file: string): Promise<string> {
        return fs.readFile(path.join(dir, file), 'utf8');
    }
});
