// cspell:ignore elisp vimrc vimx

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createExtensionConfigValidator, generateExtensionSchema } from './extensionSchema.mts';
import { describeFilePatterns, type DictionaryState, whenOn } from './dictionaryState.mts';
import { dictionaryStates, type FileChange, sampleTurnsOn, syncExtension } from './syncExtension.mts';

const config = {
    name: 'demo',
    kind: 'language',
    locale: 'xx',
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

<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->
<!--- @@inject-end: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->
`;

const options = { vscodeEngine: '^1.125.0', validate: createExtensionConfigValidator(generateExtensionSchema()) };

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
            '.vscodeignore',
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

    it('lists the locales that turn each dictionary on for a language', async () => {
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            dictionaryDefinitions: [{ name: 'demo' }, { name: 'unused' }],
            languageSettings: [{ languageId: '*', locale: 'xx, xx_YY,xx-90', dictionaries: ['demo'] }],
        });
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`demo`', Locales: '`xx`, `xx-YY`, `xx-90`' },
        ]);
    });

    it('lists the file types that turn each dictionary on for the other kinds', async () => {
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
            overrides: [{ filename: ['**/*.{el,lisp}'], dictionaries: ['lisp'] }],
            languageSettings: [
                { languageId: 'c,cpp', locale: '*', dictionaries: ['c-only'] },
                { languageId: ['html', 'css'], locale: '*', dictionaries: ['web'] },
                { languageId: '*', locale: '*', dictionaries: ['any'] },
                { languageId: 'elisp', locale: '*', dictionaries: ['lisp'] },
                { locale: '*', dictionaries: ['everywhere'] },
            ],
        });
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`c-only`', 'File types': '`c`, `cpp`' },
            { Dictionary: '`web`', 'File types': '`html`, `css`' },
            { Dictionary: '`any`', 'File types': 'all' },
            { Dictionary: '`always`', 'File types': 'all' },
            { Dictionary: '`off`', 'File types': 'off until turned on' },
            { Dictionary: '`lisp`', 'File types': '`elisp`, and `.el` and `.lisp` files' },
            { Dictionary: '`everywhere`', 'File types': 'all' },
        ]);
        const states = await dictionaryStates(dir, await readJson('extension.config.json'));
        assert.deepEqual(
            states.filter((d) => d.off).map((d) => d.name),
            ['off'],
        );
        assert.equal(states.length, 7);
        const lisp = states.filter((d) => d.name === 'lisp');
        assert.equal(sampleTurnsOn('samples/sample.el', lisp), true);
        assert.equal(sampleTurnsOn('samples/sample.lisp', lisp), true);
        assert.equal(sampleTurnsOn('samples/sample.txt', lisp), false);
        assert.equal(
            sampleTurnsOn(
                'samples/sample.txt',
                states.filter((d) => d.name === 'everywhere'),
            ),
            true,
        );
        assert.equal(sampleTurnsOn('samples/sample.txt', states), true);
        assert.deepEqual(states.map(whenOn), [
            'on for `c` and `cpp` files',
            'on for `html` and `css` files',
            'on for every file',
            'on for every file',
            'off until you turn it on',
            'on for `elisp` files, and for `.el` and `.lisp` files',
            'on for every file',
        ]);
    });

    it("reads an override's globs and language settings, but only globs that reach the user's files", async () => {
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            dictionaryDefinitions: [{ name: 'ada' }, { name: 'web' }],
            overrides: [
                { filename: '*.adb', dictionaries: ['ada'] },
                { filename: '**/*.html', languageSettings: [{ languageId: '*', dictionaries: ['web'] }] },
            ],
        });
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`ada`', 'File types': 'off until turned on' },
            { Dictionary: '`web`', 'File types': '`.html` files' },
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
        assert.deepEqual(result.devDependencies, { '@internal/extension-runtime': 'file:../../extension-runtime' });
        assert.deepEqual(Object.keys(result).slice(0, 5), ['name', 'version', 'type', 'contributes', 'scripts']);
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
            action: 'enable',
            toggle: 'locale',
            value: 'xx',
            id: 'cSpellExt_demo.enableDemo',
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

    it('rejects a name that is not the directory', async () => {
        await writeJson('extension.config.json', { ...config, name: 'other' });
        await assert.rejects(syncExtension(dir, options), /"name" must be "demo"/);
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

describe('describeFilePatterns', () => {
    it('shows extension globs as files, and other globs as they are', () => {
        assert.equal(describeFilePatterns(['**/*.{el,lisp,lsp,l}']), '`.el`, `.lisp`, `.lsp` and `.l` files');
        assert.equal(describeFilePatterns(['*.vim']), '`.vim` files');
        assert.equal(describeFilePatterns(['**/.vimrc']), '`**/.vimrc` files');
        assert.equal(describeFilePatterns([]), '');
    });
});

describe('sampleTurnsOn', () => {
    const state = (fields: Partial<DictionaryState>): DictionaryState => ({
        name: 'demo',
        all: false,
        fileTypes: [],
        filePatterns: [],
        locales: [],
        off: false,
        ...fields,
    });

    it('takes any file for a dictionary on for every file, or off until turned on', () => {
        assert.equal(sampleTurnsOn('samples/a.txt', [state({ all: true })]), true);
        assert.equal(sampleTurnsOn('samples/a.txt', [state({ off: true })]), true);
    });

    it('matches a file type or a glob', () => {
        assert.equal(sampleTurnsOn('samples/a.clj', [state({ fileTypes: ['clojure'] })]), true);
        assert.equal(sampleTurnsOn('samples/a.txt', [state({ fileTypes: ['clojure'] })]), false);
        const vim = [state({ filePatterns: ['**/*.vim'] })];
        assert.equal(sampleTurnsOn('samples/a.vim', vim), true);
        assert.equal(sampleTurnsOn(path.join('samples', 'a.vim'), vim), true);
        assert.equal(sampleTurnsOn('samples/a.vimx', vim), false);
        assert.equal(sampleTurnsOn('samples/a.lisp', [state({ filePatterns: ['**/*.{el,lisp}'] })]), true);
    });
});

describe('whenOn', () => {
    it('names the files of a dictionary turned on only by its overrides', () => {
        const lisp: DictionaryState = {
            name: 'lisp',
            all: false,
            fileTypes: [],
            filePatterns: ['**/*.{el,lisp}'],
            locales: [],
            off: false,
        };
        assert.equal(whenOn(lisp), 'on for `.el` and `.lisp` files');
    });
});
