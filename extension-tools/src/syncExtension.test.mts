// cspell:ignore elisp vimrc vimx

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { clearCachedFiles } from 'cspell-lib';

import { readExtensionConfigValidator } from './extensionSchema.mts';
import { offDictionaries, syncExtension } from './syncExtension.mts';
import type { FileChange } from './syncExtension.mts';

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
        await assert.rejects(
            syncExtension(dir, options),
            /can't read an import\. Run `npm run setup` first\.\n.*@cspell\/dict-demo\/cspell-ext\.json/,
        );
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
                { name: 'unused' },
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
                { filename: '**/*.md', dictionaries: ['off'] },
                // Sets the file type of the matching files, and names no dictionary: no row.
                { filename: '**/*.mdx', languageId: 'markdown' },
            ],
        });
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        await syncExtension(dir, options);
        assert.deepEqual(JSON.parse(await read('static/dictionaries.json')), [
            { Dictionary: '`always`', locale: '', languageId: '', glob: '' },
            { Dictionary: '`c-only`', locale: '', languageId: '`c`, `cpp`', glob: '' },
            { Dictionary: '`web`', locale: '', languageId: '`html`, `css`', glob: '' },
            { Dictionary: '`any`', locale: '', languageId: '', glob: '' },
            { Dictionary: '`lisp`', locale: '', languageId: '`elisp`', glob: '' },
            { Dictionary: '`everywhere`', locale: '', languageId: '', glob: '' },
            { Dictionary: '`lisp`', locale: '', languageId: '', glob: '`**/*.el`, `**/.emacs`' },
            { Dictionary: '`off`', locale: '', languageId: '', glob: '`**/*.md`' },
        ]);
        // Off: no row. An override's glob turns `off` on.
        assert.deepEqual(await offDictionaries(dir, await readJson('extension.config.json')), ['unused']);
    });

    it('fails on a setting the table would show wrongly', async () => {
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        const unsupported: [object, RegExp][] = [
            [{ dictionaries: ['!demo'] }, /turning a dictionary off \(!demo\) isn't supported/],
            [
                { overrides: [{ filename: '**/*.md', languageId: 'markdown', dictionaries: ['demo'] }] },
                /an override that names dictionaries and sets "language" or "languageId" isn't supported/,
            ],
            [
                { overrides: [{ filename: '**/*.md', language: 'en', dictionaries: ['demo'] }] },
                /an override that names dictionaries and sets "language" or "languageId" isn't supported/,
            ],
        ];
        for (const [ext, message] of unsupported) {
            await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', ext);
            // cspell-lib caches the files it read; this one changed.
            await clearCachedFiles();
            await assert.rejects(syncExtension(dir, options), message);
        }
    });

    it('reads the packages a package imports', async () => {
        await writeJson('node_modules/@cspell/dict-other/package.json', {
            name: '@cspell/dict-other',
            version: '1.0.0',
        });
        await writeJson('node_modules/@cspell/dict-other/cspell-ext.json', {
            dictionaryDefinitions: [{ name: 'other', path: './other.txt' }],
            dictionaries: ['other'],
        });
        await writeJson('node_modules/@cspell/dict-demo/cspell-ext.json', {
            import: ['@cspell/dict-other/cspell-ext.json'],
            dictionaryDefinitions: [{ name: 'demo', path: './demo.txt' }],
            dictionaries: ['demo'],
        });
        await clearCachedFiles();
        const { locale: _locale, ...rest } = config;
        await writeJson('extension.config.json', { ...rest, kind: 'wordList', commands: [] });
        await fs.writeFile(path.join(dir, 'README.md'), '# Demo\n');
        await syncExtension(dir, options);
        assert.deepEqual(
            JSON.parse(await read('static/dictionaries.json')).map((row: { Dictionary: string }) => row.Dictionary),
            ['`other`', '`demo`'],
        );
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
