import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { type FileChange, syncExtension } from './syncExtension.mts';

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

const readme = `# Demo

Commands:

<!--- @@inject: ./static/commands.md --->
<!--- @@inject-end: ./static/commands.md --->

<!--- @@inject: ./static/requirements.md --->
<!--- @@inject-end: ./static/requirements.md --->
`;

const options = { vscodeEngine: '^1.125.0', engines: { cspell: '>=10', 'code-spell-checker': '>=4.7.0' } };

describe('syncExtension', () => {
    let dir = '';

    beforeEach(async () => {
        dir = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'sync-')), 'demo');
        await fs.mkdir(dir);
        await writeJson('extension.config.json', config);
        await writeJson('package.json', pkg);
        await fs.writeFile(path.join(dir, 'README.md'), readme);
    });

    afterEach(async () => {
        await fs.rm(path.dirname(dir), { recursive: true, force: true });
    });

    it('writes the owned and generated files', async () => {
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'update'), [
            '.gitignore',
            '.vscode/launch.json',
            '.vscode/tasks.json',
            '.vscodeignore',
            'README.md',
            'package.json',
            'static/commands.md',
            'static/cspell-ext.json',
            'static/requirements.md',
            'tsconfig.json',
            'tsdown.config.ts',
        ]);
        assert.deepEqual(files(changes, 'remove'), []);
    });

    it('writes static/cspell-ext.json with the engines, overridden by the config', async () => {
        await writeJson('extension.config.json', { ...config, engines: { cspell: '>=10.4.0' } });
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/cspell-ext.json')), {
            import: ['@cspell/dict-demo/cspell-ext.json'],
            engines: { cspell: '>=10.4.0', 'code-spell-checker': '>=4.7.0' },
        });
        assert.match(await read('static/requirements.md'), /\| `>=10\.4\.0` \|/);
    });

    it('injects the fragments into the README', async () => {
        await syncExtension(dir, options);
        const result = await read('README.md');
        assert.match(
            result,
            /- `Enable Demo Spell Checker Dictionary`\n- `Disable Demo Spell Checker Dictionary in Workspace`/,
        );
        assert.match(result, /## Requirements/);
    });

    it('removes the files the shared entry and static/ replace', async () => {
        await fs.mkdir(path.join(dir, 'src'));
        await fs.writeFile(path.join(dir, 'src/extension.ts'), 'old\n');
        await fs.writeFile(path.join(dir, 'cspell-ext.json'), '{}\n');
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['cspell-ext.json', 'src/extension.ts']);
        assert.equal(await exists('src/extension.ts'), false);
        assert.equal(await exists('cspell-ext.json'), false);
    });

    it('has no commands fragment without commands', async () => {
        await syncExtension(dir, options);
        await writeJson('extension.config.json', { ...config, commands: [] });
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['static/commands.md']);
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
        assert.equal(result.scripts['check-types'], undefined);
        assert.equal(result.scripts['test:cspell'], 'cspell -c static/cspell-ext.json samples');
        assert.equal(result.scripts['test:vscode'], 'node ../../test-runner/bin.mjs . --sample samples/demo.md');
        assert.equal(result.scripts.extra, undefined);
        assert.deepEqual(result.dependencies, pkg.dependencies);
        assert.deepEqual(Object.keys(result).slice(0, 5), ['name', 'version', 'type', 'contributes', 'scripts']);
    });

    it('type-checks src/custom.ts when there is one, and keeps it', async () => {
        await fs.mkdir(path.join(dir, 'src'));
        await fs.writeFile(path.join(dir, 'src/custom.ts'), 'export {};\n');
        await syncExtension(dir, options);
        assert.equal(JSON.parse(await read('package.json')).scripts['check-types'], 'tsc -p .');
        assert.equal(await read('src/custom.ts'), 'export {};\n');
    });

    it('changes nothing the second time', async () => {
        await syncExtension(dir, options);
        assert.deepEqual(await syncExtension(dir, { ...options, check: true }), []);
    });

    it('only reports with check', async () => {
        const changes = await syncExtension(dir, { ...options, check: true });
        assert.ok(files(changes, 'update').includes('package.json'));
        assert.equal(JSON.parse(await read('package.json')).name, 'old-name');
        assert.equal(await read('README.md'), readme);
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

    async function exists(file: string): Promise<boolean> {
        return fs.access(path.join(dir, file)).then(
            () => true,
            () => false,
        );
    }
});

function files(changes: FileChange[], action: FileChange['action']): string[] {
    return changes
        .filter((c) => c.action === action)
        .map((c) => c.file)
        .toSorted();
}
