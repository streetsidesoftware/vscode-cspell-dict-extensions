import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { testEach } from '@streetsidesoftware/test-each';

import { extensionsToTest } from './extensionsToTest.mts';

const all = ['extensions/german', 'extensions/swedish', 'extensions/swiss-german'];

describe('extensionsToTest', () => {
    it('tests nothing without changes', () => {
        assert.deepEqual(extensionsToTest([], all), { extensions: [], shared: false });
    });

    it('tests the extensions whose files changed, in the order of the list', () => {
        const changed = ['extensions/swiss-german/package.json', 'extensions/german/samples/seattle.md'];
        assert.deepEqual(extensionsToTest(changed, all), {
            extensions: ['extensions/german', 'extensions/swiss-german'],
            shared: false,
        });
    });

    it('tests an extension whose README changed', () => {
        assert.deepEqual(extensionsToTest(['extensions/swedish/README.md'], all), {
            extensions: ['extensions/swedish'],
            shared: false,
        });
    });

    it('skips Markdown outside the extensions and other workflows', () => {
        const changed = ['README.md', 'static/footer.md', '.github/workflows/lint.yml', '.github/dependabot.yml'];
        assert.deepEqual(extensionsToTest(changed, all), { extensions: [], shared: false });
    });

    it('skips extension-tools', () => {
        const changed = ['extension-tools/src/syncExtension.mts', 'extension-tools/templates/sync/tsdown.config.ts'];
        assert.deepEqual(extensionsToTest(changed, all), { extensions: [], shared: false });
    });

    it('skips the release-please config and the workspace', () => {
        const changed = ['release-please-config.json', 'dict-extensions.code-workspace'];
        assert.deepEqual(extensionsToTest(changed, all), { extensions: [], shared: false });
    });

    it('skips the folders no build or test reads', () => {
        const changed = [
            '.claude/settings.json',
            '.vscode/settings.json',
            'docs/diagram.svg',
            'images/SpellCheck.png',
            'static/engines.json',
        ];
        assert.deepEqual(extensionsToTest(changed, all), { extensions: [], shared: false });
    });

    testEach`
        file
        ${'extension-runtime/src/entry.ts'}
        ${'package-lock.json'}
        ${'.github/workflows/test.yml'}
        ${'extensions/removed/package.json'}
    `('tests everything when the shared file $file changed', ({ file }: { file: string }) => {
        assert.deepEqual(extensionsToTest(['extensions/german/README.md', file], all), {
            extensions: all,
            shared: true,
        });
    });
});
