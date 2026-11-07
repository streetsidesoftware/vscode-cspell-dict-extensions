import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { ExtensionConfig } from '../../../extension-runtime/api.ts';
import type { Answers } from './questions.mts';
import { setUpWordList } from './wordList.mts';
import { extensionConfig } from './writeExtension.mts';

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
    });

    afterEach(() => rm(destDir, { recursive: true, force: true }));

    it('turns on the dictionaries for the samples when no setting does', async () => {
        await setUpWordList(destDir, configOf({ dictionaryDefinitions }));
        const samples = await readFile(path.join(destDir, 'samples/cspell.json'), 'utf8');
        assert.deepEqual(JSON.parse(samples), { dictionaries: ['demo'] });
    });

    it('leaves the samples alone when a setting turns the dictionaries on', async () => {
        await setUpWordList(destDir, configOf({ dictionaryDefinitions, dictionaries: ['demo'] }));
        await assert.rejects(access(path.join(destDir, 'samples/cspell.json')));
    });
});
