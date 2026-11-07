import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ExtensionConfig } from '../../../extension-runtime/api.ts';
import type { Answers } from './questions.mts';
import { setUpWordList } from './wordList.mts';
import { extensionConfig, readme } from './writeExtension.mts';

const answers: Answers = {
    name: 'demo',
    friendlyName: 'Demo',
    kind: 'wordList',
    packages: [],
    locale: '',
    locales: [],
    languages: [],
    nativeName: '',
    displayName: '',
    description: '',
    license: 'GPL-3.0-or-later',
};

function configOf(cspell: ExtensionConfig['cspell']): ExtensionConfig {
    return { ...extensionConfig(answers, 'samples/sample.md'), cspell };
}

describe('setUpWordList', () => {
    let destDir = '';
    const dictionaryDefinitions = [{ name: 'demo', path: './demo.txt' }];

    beforeEach(async () => {
        destDir = await mkdtemp(path.join(tmpdir(), 'cspell-dict-word-list-'));
        await mkdir(path.join(destDir, 'samples'));
        await writeFile(path.join(destDir, 'README.md'), readme(answers));
    });

    afterEach(() => rm(destDir, { recursive: true, force: true }));

    it('leaves the dictionaries out of the README when no setting turns one on', async () => {
        await setUpWordList(destDir, answers, configOf({ dictionaryDefinitions }));
        const text = await readFile(path.join(destDir, 'README.md'), 'utf8');
        assert.doesNotMatch(text, /dictionaries\.json/);
        const samples = await readFile(path.join(destDir, 'samples/cspell.json'), 'utf8');
        assert.deepEqual(JSON.parse(samples), { dictionaries: ['demo'] });
    });

    it('keeps the dictionaries in the README when a setting turns one on', async () => {
        await setUpWordList(destDir, answers, configOf({ dictionaryDefinitions, dictionaries: ['demo'] }));
        const text = await readFile(path.join(destDir, 'README.md'), 'utf8');
        assert.match(text, /dictionaries\.json/);
    });
});
