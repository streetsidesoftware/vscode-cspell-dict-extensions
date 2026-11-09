import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { testEach } from '@streetsidesoftware/test-each';

import { findWordingProblems, isChecked } from './wording.mts';

describe('findWordingProblems', () => {
    testEach`
        text                                                        | phrase                        | fix
        ${'Users turn on the language.'}                            | ${'turn on'}                  | ${'enable'}
        ${'The label turns it off.'}                                | ${'turns it off'}             | ${'disable'}
        ${'A PR turning the mode on.'}                              | ${'turning the mode on'}      | ${'enable'}
        ${'The dictionary is on when cSpell.language includes bn.'} | ${'is on'}                    | ${'enabled'}
        ${'It stays off until it is added.'}                        | ${'stays off'}                | ${'disabled'}
        ${'While it is on, every release is a pre-release.'}        | ${'is on'}                    | ${'enabled'}
        ${'A user who added fr keeps this dictionary on.'}          | ${'keeps this dictionary on'} | ${'enabled'}
        ${'Commands to turn the toggle on or off.'}                 | ${'on or off'}                | ${'enable or disable'}
        ${'Commands that switch it on and off.'}                    | ${'on and off'}               | ${'enable and disable'}
        ${'An on/off switch.'}                                      | ${'on/off'}                   | ${'enable or disable'}
        ${'The dictionary is off by default.'}                      | ${'off by default'}           | ${'disabled'}
    `('finds "$phrase" in "$text"', ({ text, phrase, fix }: { text: string; phrase: string; fix: string }) => {
        const problems = findWordingProblems(text);
        assert.ok(
            problems.some((problem) => problem.phrase === phrase && problem.fix === fix),
            JSON.stringify(problems),
        );
    });

    it('finds a phrase that Prettier wrapped onto the next line', () => {
        assert.deepEqual(findWordingProblems('Users turn\n   it on.'), [
            { index: 6, phrase: 'turn\n   it on', fix: 'enable' },
        ]);
    });

    testEach`
        text
        ${'The package is on npm.'}
        ${'The extension is on the Marketplace when it is released.'}
        ${'It depends on the locale.'}
        ${'Write "turn on" and "turn off" as "enable" and "disable".'}
        ${'Not "on" and "off".'}
        ${'Return on investment.'}
        ${'It runs on every file.'}
        ${'Enable the dictionary, then disable it.'}
    `('allows "$text"', ({ text }: { text: string }) => {
        assert.deepEqual(findWordingProblems(text), []);
    });
});

describe('isChecked', () => {
    testEach`
        file                                           | checked
        ${'docs/style.md'}                             | ${true}
        ${'extension-tools/src/drift.mts'}             | ${true}
        ${'extensions/french/extension.config.json'}   | ${true}
        ${'extensions/french/README.md'}               | ${true}
        ${'LICENSE'}                                   | ${false}
        ${'extensions/danish/COPYING'}                 | ${false}
        ${'extensions/french/CHANGELOG.md'}            | ${false}
        ${'extensions/french/package-lock.json'}       | ${false}
        ${'static/generated/dictionaries.md'}          | ${false}
        ${'extensions/french/extension.js'}            | ${false}
        ${'extensions/english/samples/seattle.md'}     | ${false}
        ${'scripts/lib/wording.test.mts'}              | ${false}
        ${'scripts/lib/repo.mts'}                      | ${true}
    `('$file: $checked', ({ file, checked }: { file: string; checked: boolean }) => {
        assert.equal(isChecked(file), checked);
    });
});
