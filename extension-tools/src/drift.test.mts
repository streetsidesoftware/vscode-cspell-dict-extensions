import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/api.ts';
import { findDrift } from './drift.mts';

function command(toggle: 'locale' | 'dictionary', value: string): CommandConfig {
    return { id: `cSpellExt_demo.${value}`, title: value, action: 'enable', toggle, value, scope: 'global' };
}

function config(locale: string, commands: CommandConfig[], cspell: object = {}): ExtensionConfig {
    return {
        name: 'demo',
        kind: 'language',
        locale,
        friendlyName: 'Demo',
        displayName: 'Demo - Code Spell Checker',
        description: 'Demo.',
        sample: 'samples/demo.md',
        cspell: { import: ['@cspell/dict-demo/cspell-ext.json'], ...cspell },
        commands,
    };
}

describe('findDrift', () => {
    let dir = '';

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-'));
        const pkgDir = path.join(dir, 'node_modules/@cspell/dict-demo');
        await fs.mkdir(pkgDir, { recursive: true });
        await fs.writeFile(path.join(dir, 'package.json'), '{}');
        await fs.writeFile(path.join(pkgDir, 'package.json'), '{ "name": "@cspell/dict-demo" }');
        const ext = {
            dictionaryDefinitions: [{ name: 'demo' }],
            languageSettings: [
                { locale: 'xx,xx_ZZ', dictionaries: ['demo'] },
                { locale: ['xx-YY', 'xx-AA xx-BB|xx-CC;xx-DD'], dictionaries: ['demo'] },
            ],
        };
        await fs.writeFile(path.join(pkgDir, 'cspell-ext.json'), JSON.stringify(ext));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it('finds nothing when the packages back up the config, comparing locales the way cspell does', async () => {
        const commands = [command('locale', 'xx-ZZ,xx'), command('locale', 'XX_yy'), command('dictionary', 'demo')];
        assert.deepEqual(await findDrift(dir, config('xx', commands)), []);
        const separators = [command('locale', 'xx-AA xx-BB'), command('locale', 'xx-CC|xx-DD')];
        assert.deepEqual(await findDrift(dir, config('xx-dd', separators)), []);
    });

    it("counts the config's own cspell", async () => {
        const cspell = {
            dictionaryDefinitions: [{ name: 'own', path: './own.txt' }],
            languageSettings: [{ locale: 'qq', dictionaries: ['own'] }],
        };
        const commands = [command('dictionary', 'own'), command('locale', 'qq')];
        assert.deepEqual(await findDrift(dir, config('qq', commands, cspell)), []);
    });

    it("ignores a dictionary definition's locale, which turns nothing on", async () => {
        const cspell = { dictionaryDefinitions: [{ name: 'own', path: './own.txt', locale: 'qq' }] };
        assert.deepEqual(await findDrift(dir, config('qq', [], cspell)), [
            '"locale" is "qq", but no language setting declares it.',
        ]);
    });

    it('has no locale to check for a word list', async () => {
        const { locale: _locale, ...rest } = { ...config('zz', [command('dictionary', 'demo')]), locale: 'zz' };
        assert.deepEqual(await findDrift(dir, { ...rest, kind: 'wordList' }), []);
    });

    it('reports a dictionary and locales no package has', async () => {
        const commands = [command('dictionary', 'gone'), command('locale', 'xx,qq')];
        assert.deepEqual(await findDrift(dir, config('zz', commands)), [
            'cSpellExt_demo.gone turns "gone" on or off, but nothing defines that dictionary.',
            'cSpellExt_demo.xx,qq turns locale "qq" on or off, but no language setting declares it.',
            '"locale" is "zz", but no language setting declares it.',
        ]);
    });
});
