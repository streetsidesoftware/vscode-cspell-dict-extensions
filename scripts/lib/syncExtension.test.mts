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

<!--- @@inject-table: ./static/commands.json --->
<!--- @@inject-end: ./static/commands.json --->

<!--- @@inject: ../../static/requirements.md#values-file=:./static/cspell-ext.json --->
<!--- @@inject-end: ../../static/requirements.md#values-file=:./static/cspell-ext.json --->
`;

const options = { vscodeEngine: '^1.125.0', engines: { cspell: '>=10', 'code-spell-checker': '>=4.7.0' } };

describe('syncExtension', () => {
    let dir = '';

    beforeEach(async () => {
        // The layout of the repository: the shared README templates are in `<root>/static/`.
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-'));
        await fs.mkdir(path.join(root, 'static'));
        await fs.writeFile(path.join(root, 'static/requirements.md'), 'cspell `{@ engines.cspell @}`\n');
        dir = path.join(root, 'extensions/demo');
        await fs.mkdir(dir, { recursive: true });
        await writeJson('extension.config.json', config);
        await writeJson('package.json', pkg);
        await fs.writeFile(path.join(dir, 'README.md'), readme);
    });

    afterEach(async () => {
        await fs.rm(path.resolve(dir, '../..'), { recursive: true, force: true });
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
            'static/commands.json',
            'static/cspell-ext.json',
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
        assert.match(await read('README.md'), /cspell `>=10\.4\.0`/);
    });

    it('fills the README from the shared templates and static/ data', async () => {
        await syncExtension(dir, options);
        const result = await read('README.md');
        assert.match(
            result,
            /\| Enable Demo Spell Checker Dictionary +\|\n\| Disable Demo Spell Checker Dictionary in Workspace \|/,
        );
        assert.match(result, /cspell `>=10`/);
    });

    it('removes the files the shared entry, static/ and the templates replace', async () => {
        await fs.mkdir(path.join(dir, 'src'));
        await fs.mkdir(path.join(dir, 'static'));
        await fs.writeFile(path.join(dir, 'src/extension.ts'), 'old\n');
        await fs.writeFile(path.join(dir, 'cspell-ext.json'), '{}\n');
        await fs.writeFile(path.join(dir, 'static/commands.md'), 'old\n');
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['cspell-ext.json', 'src/extension.ts', 'static/commands.md']);
        assert.equal(await exists('src/extension.ts'), false);
        assert.equal(await exists('cspell-ext.json'), false);
    });

    it('has no static/commands.json without commands', async () => {
        await syncExtension(dir, options);
        await writeJson('extension.config.json', { ...config, commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['static/commands.json']);
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
