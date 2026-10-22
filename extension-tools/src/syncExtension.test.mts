// cspell:ignore elisp vimrc vimx

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { readExtensionConfigValidator } from './extensionSchema.mts';
import { whenOn } from './dictionaryState.mts';
import { dictionaryStates, type FileChange, syncExtension } from './syncExtension.mts';

const config = {
    name: 'demo',
    kind: 'language',
    locale: 'xx',
    friendlyName: 'Demo',
    displayName: 'Demo - Code Spell Checker',
    description: 'Adds Demo spell checking to Code Spell Checker.',
    sample: 'samples/demo.md',
    cspell: { import: ['@cspell/dict-demo/cspell-ext.json'] },
    commands: [
        {
            id: 'cSpellExt_demo.enable',
            title: 'Enable Demo Spell Checker Dictionary',
            action: 'enable',
            toggle: 'locale',
            value: 'xx',
            scope: 'global',
        },
        {
            id: 'cSpellExt_demo.disableWorkspace',
            title: 'Disable Demo Spell Checker Dictionary in Workspace',
            action: 'disable',
            toggle: 'dictionary',
            value: 'demo',
            scope: 'workspace',
        },
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

<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->
<!--- @@inject-end: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->
`;

const options = { vscodeEngine: '^1.125.0', validate: await readExtensionConfigValidator() };

describe('syncExtension', () => {
    let dir = '';

    beforeEach(async () => {
        // The layout of the repository: the shared README templates are in `<root>/static/`.
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-'));
        await fs.mkdir(path.join(root, 'static'));
        await fs.writeFile(path.join(root, 'static/requirements.md'), 'cspell `{@ engines.cspell @}`\n');
        await fs.writeFile(path.join(root, 'static/engines.json'), '{ "engines": { "cspell": ">=10" } }\n');
        dir = path.join(root, 'extensions/demo');
        await fs.mkdir(dir, { recursive: true });
        await writeJson('extension.config.json', config);
        await writeJson('package.json', pkg);
        await fs.writeFile(path.join(dir, 'README.md'), readme);
        await writeJson('node_modules/@cspell/dict-demo/package.json', { name: '@cspell/dict-demo', version: '1.0.0' });
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {});
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
            'README.md',
            'package.json',
            'static/commands.json',
            'static/cspell-ext.json',
            'tsdown.config.ts',
        ]);
        assert.deepEqual(files(changes, 'remove'), []);
    });

    it('takes the engines from static/engines.json, overridden in static/cspell-ext.json', async () => {
        await syncExtension(dir, options);
        assert.deepEqual(await readJson('static/cspell-ext.json'), config.cspell);
        assert.match(await read('README.md'), /cspell `>=10`/);

        const cspell = { ...config.cspell, engines: { cspell: '>=10.4.0' } };
        await writeJson('extension.config.json', { ...config, cspell });
        await syncExtension(dir, options);
        assert.deepEqual(await readJson('static/cspell-ext.json'), cspell);
        assert.match(await read('README.md'), /cspell `>=10\.4\.0`/);
    });

    it('takes the engines the dictionaries declare, unless cspell.engines sets them', async () => {
        const engines = { cspell: '>=10.4.0', 'code-spell-checker': '>=4.10.0' };
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', { engines });
        await syncExtension(dir, options);
        assert.deepEqual(await readJson('static/cspell-ext.json'), { ...config.cspell, engines });
        assert.match(await read('README.md'), /cspell `>=10\.4\.0`/);

        const cspell = { ...config.cspell, engines: { cspell: '>=10.5.0' } };
        await writeJson('extension.config.json', { ...config, cspell });
        await syncExtension(dir, options);
        assert.deepEqual((await readJson('static/cspell-ext.json')).engines, {
            cspell: '>=10.5.0',
            'code-spell-checker': '>=4.10.0',
        });
    });

    it('needs the dictionaries installed', async () => {
        await fs.rm(path.join(dir, 'node_modules'), { recursive: true });
        await assert.rejects(syncExtension(dir, options), /can't find "@cspell\/dict-demo\/cspell-ext\.json"/);
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

    it('fails on an unresolved placeholder or a missing file in the README', async () => {
        const root = path.resolve(dir, '../..');
        await fs.writeFile(path.join(root, 'static/requirements.md'), 'cspell `{@ engines.missing @}`\n');
        await assert.rejects(syncExtension(dir, options), /README\.md:\d+: .*engines\.missing/);

        await fs.writeFile(
            path.join(dir, 'README.md'),
            '<!--- @@inject: ./missing.md --->\n<!--- @@inject-end: ./missing.md --->\n',
        );
        await assert.rejects(syncExtension(dir, options), /README\.md:\d+: .*missing\.md/);
    });

    it('creates cspell.config.yaml when missing and keeps an existing one', async () => {
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'create'), ['cspell.config.yaml']);
        assert.equal(await read('cspell.config.yaml'), 'import:\n  - ./static/cspell-ext.json\n');

        await fs.writeFile(path.join(dir, 'cspell.config.yaml'), 'words: [demo]\n');
        assert.deepEqual(await syncExtension(dir, options), []);
        assert.equal(await read('cspell.config.yaml'), 'words: [demo]\n');
    });

    it('lists each setting that names a dictionary, as written', async () => {
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            dictionaryDefinitions: [{ name: 'demo' }, { name: 'unused' }],
            languageSettings: [{ languageId: '*', locale: 'xx, xx_YY,xx-90', dictionaries: ['demo'] }],
        });
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`demo`', locale: '`xx, xx_YY,xx-90`', languageId: '`*`', glob: '' },
        ]);
    });

    it('lists the top-level dictionaries, the language settings and the overrides, in that order', async () => {
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            dictionaryDefinitions: [
                { name: 'c-only' },
                { name: 'web' },
                { name: 'any' },
                { name: 'always' },
                { name: 'off' },
                { name: 'lisp' },
                { name: 'everywhere' },
            ],
            dictionaries: ['always'],
            languageSettings: [
                { languageId: 'c,cpp', locale: '*', dictionaries: ['c-only'] },
                { languageId: ['html', 'css'], locale: '*', dictionaries: ['web'] },
                { languageId: '*', locale: '*', dictionaries: ['any'] },
                { languageId: 'elisp', locale: '*', dictionaries: ['lisp'] },
                { locale: '*', dictionaries: ['everywhere'] },
            ],
            overrides: [
                { filename: ['**/*.el', '**/.emacs'], dictionaries: ['lisp'] },
                { filename: '**/*.md', languageId: 'markdown', language: 'en', dictionaries: ['off'] },
            ],
        });
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`always`', locale: '', languageId: '', glob: '' },
            { Dictionary: '`c-only`', locale: '`*`', languageId: '`c,cpp`', glob: '' },
            { Dictionary: '`web`', locale: '`*`', languageId: '`html`, `css`', glob: '' },
            { Dictionary: '`any`', locale: '`*`', languageId: '`*`', glob: '' },
            { Dictionary: '`lisp`', locale: '`*`', languageId: '`elisp`', glob: '' },
            { Dictionary: '`everywhere`', locale: '`*`', languageId: '', glob: '' },
            { Dictionary: '`lisp`', locale: '', languageId: '', glob: '`**/*.el`, `**/.emacs`' },
            { Dictionary: '`off`', locale: '`en`', languageId: '`markdown`', glob: '`**/*.md`' },
        ]);
        const states = await dictionaryStates(dir, await readJson('extension.config.json'));
        assert.deepEqual(
            states.filter((d) => d.off).map((d) => d.name),
            ['off'],
        );
        assert.equal(states.length, 7);
        assert.deepEqual(states.map(whenOn), [
            'on for `c` and `cpp` files',
            'on for `html` and `css` files',
            'on for every file',
            'on for every file',
            'off until you turn it on',
            'on for `elisp` files',
            'on for every file',
        ]);
    });

    it('has no static/dictionaries.json for a bundle', async () => {
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            dictionaryDefinitions: [{ name: 'demo' }],
            dictionaries: ['demo'],
        });
        await syncExtension(dir, options);
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'bundle', description: 'D', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['static/commands.json', 'static/dictionaries.json']);
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
        const result = await readJson('package.json');
        assert.equal(result.name, 'code-spell-checker-demo');
        assert.equal(result.displayName, 'Demo - Code Spell Checker');
        assert.equal(result.version, '1.2.3');
        assert.equal(result.type, 'module');
        assert.equal(result.main, './extension.js');
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
        assert.equal(result.scripts['pack-extension'], 'vsce package --allow-unused-files-pattern');
        assert.equal(result.scripts['test:cspell'], 'cspell -c static/cspell-ext.json samples');
        assert.equal(result.scripts['test:vscode'], 'node ../../test-runner/bin.mjs . --sample samples/demo.md');
        assert.equal(result.scripts.extra, undefined);
        assert.deepEqual(result.dependencies, pkg.dependencies);
        assert.equal(result.devDependencies, undefined);
        assert.deepEqual(Object.keys(result).slice(0, 5), ['name', 'version', 'type', 'contributes', 'scripts']);
    });

    it('lists the packaged files, with COPYING and the icon when there are any', async () => {
        await syncExtension(dir, options);
        assert.deepEqual((await readJson('package.json')).files, [
            'LICENSE',
            'CHANGELOG.md',
            'extension.js',
            'static/cspell-ext.json',
            'node_modules/**',
        ]);

        await fs.writeFile(path.join(dir, 'COPYING'), 'GPL\n');
        await writeJson('package.json', { ...(await readJson('package.json')), icon: 'images/icon.png' });
        await syncExtension(dir, options);
        assert.deepEqual((await readJson('package.json')).files, [
            'LICENSE',
            'CHANGELOG.md',
            'COPYING',
            'extension.js',
            'images/icon.png',
            'static/cspell-ext.json',
            'node_modules/**',
        ]);
    });

    it('removes .vscodeignore, which vsce refuses next to files', async () => {
        await fs.writeFile(path.join(dir, '.vscodeignore'), 'src/**\n');
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['.vscodeignore']);
        await assert.rejects(read('.vscodeignore'), { code: 'ENOENT' });
    });

    it('type-checks src/custom.ts while there is one, and keeps it', async () => {
        await fs.mkdir(path.join(dir, 'src'));
        await fs.writeFile(path.join(dir, 'src/custom.ts'), 'export {};\n');
        await syncExtension(dir, options);
        assert.equal((await readJson('package.json')).scripts['check-types'], 'tsc -p .');
        assert.match(await read('tsconfig.json'), /"include": \["src"\]/);
        assert.equal(await read('src/custom.ts'), 'export {};\n');

        await fs.rm(path.join(dir, 'src'), { recursive: true });
        const changes = await syncExtension(dir, options);
        assert.deepEqual(files(changes, 'remove'), ['tsconfig.json']);
        assert.equal((await readJson('package.json')).scripts['check-types'], undefined);
    });

    it('leaves commands that do not contribute out of package.json and the README table', async () => {
        const legacy = {
            id: 'cSpellExt_demo.enableDemo',
            title: 'Enable Demo Spell Checker Dictionary',
            action: 'enable',
            toggle: 'locale',
            value: 'xx',
            scope: 'global',
            contributes: false,
            legacy: true,
            notes: 'Old ID.',
        };
        await writeJson('extension.config.json', { ...config, commands: [...config.commands, legacy] });
        await syncExtension(dir, options);
        const contributed = (await readJson('package.json')).contributes.commands.map(
            (c: { command: string }) => c.command,
        );
        assert.deepEqual(contributed, ['cSpellExt_demo.enable', 'cSpellExt_demo.disableWorkspace']);
        assert.equal((await readJson('static/commands.json')).length, 2);
    });

    it('changes nothing the second time', async () => {
        await syncExtension(dir, options);
        assert.deepEqual(await syncExtension(dir, { ...options, check: true }), []);
    });

    it('only reports with check', async () => {
        const changes = await syncExtension(dir, { ...options, check: true });
        assert.ok(files(changes, 'update').includes('package.json'));
        assert.equal((await readJson('package.json')).name, 'old-name');
        assert.equal(await read('README.md'), readme);
    });

    it('names the package after the config, not the folder', async () => {
        await writeJson('extension.config.json', { ...config, name: 'other' });
        await syncExtension(dir, options);
        assert.equal((await readJson('package.json')).name, 'code-spell-checker-other');
    });

    async function writeJson(file: string, data: unknown): Promise<void> {
        await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true });
        await fs.writeFile(path.join(dir, file), JSON.stringify(data, null, 2) + '\n');
    }

    async function readJson(file: string): Promise<any> {
        return JSON.parse(await read(file));
    }

    async function read(file: string): Promise<string> {
        return fs.readFile(path.join(dir, file), 'utf8');
    }
});

function files(changes: FileChange[], action: FileChange['action']): string[] {
    return changes
        .filter((c) => c.action === action)
        .map((c) => c.file)
        .toSorted();
}
