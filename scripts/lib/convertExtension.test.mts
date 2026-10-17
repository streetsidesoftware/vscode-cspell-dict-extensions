// cspell:ignore Dansk ordbog
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    convertCspellConfig,
    convertReadme,
    deriveConfig,
    type OldExtension,
    parseJsonc,
} from './convertExtension.mts';

const danishTs = `
const locale = 'da';
export async function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('cSpellExt_danish.enableDanish', () => enable(true)),
        vscode.commands.registerCommand('cSpellExt_danish.disableDanishWorkspace', () => disable(false)),
    );
}
`;

const danish: OldExtension = {
    name: 'danish',
    packageJson: {
        displayName: 'Danish - Code Spell Checker',
        description: 'Danish dictionary extension for VS Code.',
        scripts: { 'test:vscode': 'node ../../test-runner/bin.mjs . --sample samples/kbh.md' },
        contributes: {
            commands: [
                { command: 'cSpellExt_danish.enableDanish', title: 'Enable Danish Spell Checker Dictionary' },
                {
                    command: 'cSpellExt_danish.disableDanishWorkspace',
                    title: 'Disable Danish Spell Checker Dictionary in Workspace',
                },
            ],
        },
    },
    extensionTs: danishTs,
    cspellExt: '{ "import": ["@cspell/dict-da/cspell-ext.json"], }',
};

describe('deriveConfig', () => {
    it('derives the config, keeping legacy IDs', () => {
        const { value, warnings } = deriveConfig(danish);
        assert.deepEqual(warnings, []);
        assert.deepEqual(value, {
            $schema: '../../static/extension.config.schema.json',
            name: 'danish',
            kind: 'language',
            locale: 'da',
            friendlyName: 'Danish',
            sample: 'samples/kbh.md',
            cspell: { import: ['@cspell/dict-da/cspell-ext.json'] },
            commands: [
                { action: 'enable', toggle: 'locale', value: 'da', id: 'cSpellExt_danish.enableDanish' },
                {
                    action: 'disable',
                    toggle: 'locale',
                    value: 'da',
                    scope: 'workspace',
                    id: 'cSpellExt_danish.disableDanishWorkspace',
                },
            ],
        });
    });

    it('leaves out default IDs and titles, and keeps custom ones', () => {
        const commands = [
            { command: 'cSpellExt_danish.enable', title: 'Enable Danish Spell Checker Dictionary' },
            { command: 'cSpellExt_danish.disable', title: 'Disable the Danish dictionary' },
        ];
        const extensionTs = danishTs.replace('enableDanish', 'enable').replace('disableDanishWorkspace', 'disable');
        const old = { ...danish, extensionTs, packageJson: { ...danish.packageJson, contributes: { commands } } };
        assert.deepEqual(deriveConfig(old).value.commands, [
            { action: 'enable', toggle: 'locale', value: 'da' },
            { action: 'disable', toggle: 'locale', value: 'da', title: 'Disable the Danish dictionary' },
        ]);
    });

    it('defaults the sample to the test runner default', () => {
        const old = { ...danish, packageJson: { ...danish.packageJson, scripts: {} } };
        assert.equal(deriveConfig(old).value.sample, 'samples/seattle.md');
    });

    it('keeps a custom display name and description', () => {
        const packageJson = { ...danish.packageJson, displayName: 'Dansk', description: 'Dansk ordbog.' };
        const { value } = deriveConfig({ ...danish, packageJson });
        assert.equal(value.friendlyName, 'Dansk');
        assert.equal(value.displayName, 'Dansk');
        assert.equal(value.description, 'Dansk ordbog.');
    });

    it('takes the engines its dictionaries declare', () => {
        const importedEngines = { '@cspell/dict-da/cspell-ext.json': { cspell: '>=10.4.0' } };
        assert.deepEqual(deriveConfig({ ...danish, importedEngines }).value.cspell.engines, { cspell: '>=10.4.0' });
    });

    it('warns about what it cannot derive', () => {
        const { warnings } = deriveConfig({ ...danish, extensionTs: '' });
        assert.match(warnings.join('\n'), /No locale constant/);
        assert.match(warnings.join('\n'), /not registered in src\/extension\.ts/);
    });
});

const readme = `# Danish

### Enable Dictionary

- \`F1\` \`Show Spell Checker Configuration Info\`

### Disable Dictionary

- \`F1\` \`Show Spell Checker Configuration Info\`

### Manual Settings

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject: ../../static/footer.md --->
`;

describe('convertReadme', () => {
    it('replaces the old sections with markers', () => {
        const { value, warnings } = convertReadme(readme, true);
        assert.deepEqual(warnings, []);
        assert.match(
            value,
            /### Enable or Disable the Dictionary\n\n.*\n\n<!--- @@inject-table: \.\/static\/commands\.json --->/,
        );
        assert.doesNotMatch(value, /Show Spell Checker Configuration Info/);
        assert.match(value, /### Manual Settings/);
        assert.match(value, /<!--- @@inject: \.\.\/\.\.\/static\/requirements\.md#values-file=/);
        assert.doesNotMatch(value, /## Requirements/);
    });

    it('leaves the enable/disable section alone without commands', () => {
        assert.match(convertReadme(readme, false).value, /### Enable Dictionary/);
    });

    it('warns when a section is missing', () => {
        assert.equal(convertReadme('# Danish\n', true).warnings.length, 2);
    });
});

describe('convertCspellConfig', () => {
    it('points the import at static/', () => {
        assert.equal(
            convertCspellConfig('{ "import": ["./cspell-ext.json"] }'),
            '{ "import": ["./static/cspell-ext.json"] }',
        );
        assert.equal(
            convertCspellConfig('import:\n  - ./cspell-ext.json\n'),
            'import:\n  - ./static/cspell-ext.json\n',
        );
    });
});

describe('parseJsonc', () => {
    it('allows comments and trailing commas, but not in strings', () => {
        const content = '{\n  // a comment\n  "url": "https://example.com", /* more */\n  "list": [1, 2,],\n}';
        assert.deepEqual(parseJsonc(content), { url: 'https://example.com', list: [1, 2] });
    });
});
