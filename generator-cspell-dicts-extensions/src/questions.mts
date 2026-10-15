import { styleText } from 'node:util';

import { guessAtLocale } from './languageCodes.mts';
import type { Prompter } from './prompt.mts';

export interface Answers {
    /** The dictionary directory name, i.e. `swedish` */
    name: string;
    friendlyName: string;
    displayName: string;
    description: string;
    /** The npm package of the dictionary, i.e. `@cspell/dict-sv` */
    dictionarySrc: string;
    addCommands: boolean;
    /** Empty when `addCommands` is false. */
    commandName: string;
    /** Empty when `addCommands` is false. */
    locale: string;
    /** The extension directory, relative to the repository root. */
    target: string;
    fullPackageName: string;
}

/**
 * Ask the questions needed to generate an extension.
 * @param prompter - used to ask the questions.
 * @param defaultName - the default dictionary name, i.e. from the command line.
 */
export async function askQuestions(prompter: Prompter, defaultName?: string): Promise<Answers> {
    let name = '';
    while (!name) {
        name = normalizeName(
            await prompter.input(
                'Your extension dictionary directory name (i.e. medicalterms or german):',
                defaultName,
            ),
        );
    }

    const friendlyName = await prompter.input('Friendly Name:', toFriendlyName(name));
    const displayName = await prompter.input('Display Name:', `${title(friendlyName)} - Code Spell Checker`);
    const description = await prompter.input(
        'Description:',
        `${title(friendlyName)} dictionary extension for VS Code.`,
    );

    const locales = guessAtLocale(name);
    const localesHint = locales.length
        ? '\n  International Locales based upon name: \n  ' +
          locales.map((locale) => styleText('gray', locale)).join(', ') +
          '\n  :'
        : ':';
    const dictionarySrc = await prompter.input(
        'Source cspell-dicts Dictionary NPM name. To be installed. i.e. @cspell/dict-<name>' + localesHint,
        `@cspell/dict-${locales[0] || name}`,
    );

    const addCommands = await prompter.confirm('Add Enable / Disable Commands?', true);
    let commandName = '';
    let locale = '';
    if (addCommands) {
        commandName = await prompter.input('Base Name for Commands:', title(name).replace(/[^a-z0-9]/gi, '_'));
        locale = await prompter.input(
            'Language Locale (i.e. "en" for English or "fr" for French):',
            dictNameToLocale(dictionarySrc),
        );
    }

    const target = await prompter.input('Target Directory:', `extensions/${name}`);
    const fullPackageName = await prompter.input('NPM Package Name:', `code-spell-checker-${name}`);

    return {
        name,
        friendlyName,
        displayName,
        description,
        dictionarySrc,
        addCommands,
        commandName,
        locale,
        target,
        fullPackageName,
    };
}

export function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

const regExpCSpellDictModules = /^.*dict-/;

export function dictNameToLocale(dictModuleName: string): string {
    if (regExpCSpellDictModules.test(dictModuleName)) {
        return dictModuleName.replace(regExpCSpellDictModules, '').toLowerCase();
    }

    return '*';
}

export function toFriendlyName(name: string): string {
    return name.split('-').map(title).join(' ');
}

export function title(s: string): string {
    return s.slice(0, 1).toUpperCase() + s.slice(1);
}
