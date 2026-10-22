// cspell:ignore elisp

import { constants } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CommandConfig, ExtensionConfig } from '../../../extension-runtime/api.ts';
import { andList, type DictionaryState, whenOn } from '../dictionaryState.mts';
import { languageOf } from './locales.mts';
import { type Answers, defaultLicense, type Language } from './questions.mts';
import type { Sample } from './sample.mts';

export const templateDir: string = path.join(import.meta.dirname, '../../templates/create');

/** Files copied as is from `templates/create/`. `LICENSE` holds the text of the default license. */
const copies = ['images/SpellCheck.png'];

export interface WriteOptions {
    /** Defaults to `templates/create/`. */
    templateDir?: string;
    log?: (message: string) => void;
}

/**
 * Write the files a person owns into `destDir`: `extension.config.json`, a starter `package.json`, `README.md`,
 * `LICENSE` and the samples, and an empty `CHANGELOG.md` for release-please to fill. `npm run sync:extensions` writes
 * the rest. Existing files are never overwritten.
 * @param samples - the first is the `sample` in `extension.config.json`, which the VS Code test opens.
 * @returns the files written, relative to `destDir`.
 */
export async function writeExtension(
    destDir: string,
    answers: Answers,
    samples: readonly [Sample, ...Sample[]],
    options: WriteOptions = {},
): Promise<string[]> {
    const srcDir = options.templateDir ?? templateDir;
    const log = options.log ?? (() => undefined);
    const written: string[] = [];

    async function create(file: string, write: (dest: string) => Promise<void>): Promise<void> {
        const dest = path.join(destDir, file);
        await mkdir(path.dirname(dest), { recursive: true });
        await write(dest);
        log(`create ${file}`);
        written.push(file);
    }

    const files: [string, string][] = [
        ['extension.config.json', json(extensionConfig(answers, samples[0].file))],
        ['package.json', json(packageJson(answers))],
        ['README.md', readme(answers)],
        ...samples.map((sample): [string, string] => [sample.file, sample.text]),
        ['samples/cspell.json', json(sampleConfig(answers))],
        // Empty: release-please keeps any text that comes before the first version heading.
        ['CHANGELOG.md', ''],
    ];
    for (const [file, content] of files) {
        await create(file, (dest) => writeFile(dest, content, { flag: 'wx' }));
    }
    const licenseText = answers.license === defaultLicense ? ['LICENSE'] : [];
    if (!licenseText.length) log(`Add the text of the ${answers.license} license to LICENSE.`);
    for (const file of [...licenseText, ...copies]) {
        await create(file, (dest) => copyFile(path.join(srcDir, file), dest, constants.COPYFILE_EXCL));
    }
    return written;
}

export function json(value: unknown): string {
    return JSON.stringify(value, null, 4) + '\n';
}

/**
 * The extension's `extension.config.json`, with its fields in the order the existing ones use. `nativeName` is only
 * written when it is given.
 */
export function extensionConfig(answers: Answers, sample: string): ExtensionConfig {
    const { kind, packages } = answers;
    const head = { $schema: '../../extension-runtime/extension.config.schema.json', name: answers.name };
    const names = {
        friendlyName: answers.friendlyName,
        displayName: displayName(answers),
        description: answers.description || standardDescription(answers),
    };
    const tail = {
        sample,
        cspell: {
            import: packages.map((pkg) => (kind === 'parser' ? `${pkg}/recommended` : `${pkg}/cspell-ext.json`)),
        },
    };
    switch (kind) {
        case 'language':
            return {
                ...head,
                kind,
                ...names,
                ...(answers.nativeName ? { nativeName: answers.nativeName } : {}),
                locale: answers.locale,
                ...tail,
                commands: localeCommands(answers),
            };
        case 'wordList':
        case 'parser':
            return { ...head, kind, ...names, ...tail, commands: [] };
    }
}

/** The Marketplace name: the one given, or `<friendlyName> - Code Spell Checker`. */
export function displayName(answers: Pick<Answers, 'displayName' | 'friendlyName'>): string {
    return answers.displayName || `${answers.friendlyName} - Code Spell Checker`;
}

/**
 * The standard Marketplace description: `Adds Swedish (svenska) spell checking to Code Spell Checker.` for a language,
 * `Adds the Medical Terms dictionary to Code Spell Checker.` for a word list. A parser's is always given.
 */
function standardDescription(answers: Answers): string {
    const { friendlyName, nativeName } = answers;
    if (answers.kind !== 'language') return `Adds the ${friendlyName} dictionary to Code Spell Checker.`;
    return `Adds ${nativeName ? `${friendlyName} (${nativeName})` : friendlyName} spell checking to Code Spell Checker.`;
}

const scopes = ['global', 'workspace'] as const;
const actions = ['enable', 'disable'] as const;

type Scope = (typeof scopes)[number];
type Action = (typeof actions)[number];

/** What a set of commands turns on and off. */
interface Target {
    /** The extension's `name`, which starts the ID. */
    name: string;
    /** Names what the commands turn on in the title, e.g. `Serbian (Cyrillic)`. */
    label: string;
    /** Added to the ID after the action, e.g. `Cyrl`. */
    suffix: string;
    toggle: 'locale' | 'dictionary';
}

/**
 * A command with the standard ID and title, e.g. `cSpellExt_swedish.enableWorkspace` titled `Enable Swedish Spell
 * Checker Dictionary in Workspace`.
 */
function standardCommand(
    { name, label, suffix, toggle }: Target,
    value: string,
    action: Action,
    scope: Scope,
): CommandConfig {
    const inWorkspace = scope === 'workspace';
    const verb = action === 'enable' ? 'Enable' : 'Disable';
    return {
        id: `cSpellExt_${name}.${action}${suffix}${inWorkspace ? 'Workspace' : ''}`,
        title: `${verb} ${label} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
        action,
        toggle,
        value,
        scope,
    };
}

/**
 * Enable the locale, and disable every locale the packages declare, globally and in the workspace: `sv-SE` is enabled
 * with `sv-SE` and disabled with `sv,sv-SE`. With several languages, each also gets its own commands.
 */
export function localeCommands(
    answers: Pick<Answers, 'name' | 'friendlyName' | 'locale' | 'locales' | 'languages'>,
): CommandConfig[] {
    const { name, friendlyName } = answers;
    const value = { enable: answers.locale, disable: answers.locales.join(',') };
    const target: Target = { name, label: friendlyName, suffix: '', toggle: 'locale' };
    const main = scopes.flatMap((scope) =>
        actions.map((action) => standardCommand(target, value[action], action, scope)),
    );
    return [...main, ...answers.languages.flatMap((language) => languageCommands(name, language))];
}

/**
 * The commands of one language, e.g. `cSpellExt_serbian.enableCyrl` titled `Enable Serbian (Cyrillic) Spell Checker
 * Dictionary`. The ID ends with the locale's subtags after the language, or the language when there are none.
 */
export function languageCommands(name: string, language: Language): CommandConfig[] {
    const subtags = language.locale.split('-').slice(1).join('') || languageOf(language.locale);
    const suffix = subtags.slice(0, 1).toUpperCase() + subtags.slice(1);
    const target: Target = { name, label: language.name, suffix, toggle: 'locale' };
    return scopes.flatMap((scope) => actions.map((action) => standardCommand(target, language.locale, action, scope)));
}

/**
 * Turn a word list's dictionaries on and off, globally and in the workspace. One dictionary gets the plain IDs and
 * titles; with several, each gets its own, e.g. `cSpellExt_vim.enableVimScript` and `Enable vim-script Spell Checker
 * Dictionary`.
 * @param dictionaries - the dictionary names, e.g. `['vim']`.
 */
export function dictionaryCommands(
    config: Pick<ExtensionConfig, 'name' | 'friendlyName'>,
    dictionaries: readonly string[],
): CommandConfig[] {
    return dictionaries.flatMap((dictionary) => {
        const single = dictionaries.length === 1;
        const label = single ? config.friendlyName : dictionary;
        const suffix = single
            ? ''
            : dictionary
                  .split(/[^\p{L}\p{N}]+/u)
                  .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
                  .join('');
        const target: Target = { name: config.name, label, suffix, toggle: 'dictionary' };
        return scopes.flatMap((scope) => actions.map((action) => standardCommand(target, dictionary, action, scope)));
    });
}

/**
 * The fields of `package.json` a person owns. `npm install` adds the dependency, and the sync and
 * `fix-extensions` fill in the rest.
 */
export function packageJson(answers: Answers): Record<string, unknown> {
    return {
        name: `code-spell-checker-${answers.name}`,
        version: '0.0.1',
        license: answers.license,
        icon: 'images/SpellCheck.png',
        sponsor: { url: 'https://github.com/sponsors/streetsidesoftware' },
        extensionKind: ['workspace'],
        categories: ['Linters', 'Other'],
        keywords: [answers.friendlyName, 'VS Code Extension', 'Spelling Checker', 'dictionary', 'spelling'],
        activationEvents: ['onStartupFinished'],
        qna: 'marketplace',
        capabilities: { virtualWorkspaces: true, untrustedWorkspaces: { supported: true } },
        extensionDependencies: ['streetsidesoftware.code-spell-checker'],
    };
}

const codeSpellChecker =
    '[Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker)';

/** An `@@inject` section, filled in by the sync. */
function inject(marker: string, kind: 'inject' | 'inject-table' = 'inject'): string {
    return `<!--- @@${kind}: ${marker} --->\n<!--- @@inject-end: ${marker} --->\n`;
}

/**
 * What a word list's README says happens once it's installed, from its installed packages, such as "Once this
 * extension is installed, the `elisp` dictionary is on for `elisp` and `lisp` files." Dictionaries that are on in the
 * same way share a clause.
 */
export function installedSentence(dictionaries: readonly DictionaryState[]): string {
    const byWhen = Map.groupBy(dictionaries, whenOn);
    const clauses = [...byWhen].map(([when, group]) =>
        clause(
            group.map((d) => `\`${d.name}\``),
            when,
        ),
    );
    const joined = clauses.length > 1 ? `${clauses.slice(0, -1).join(', ')}, and ${clauses.at(-1)}` : clauses[0];
    return `Once this extension is installed, ${joined}.`;
}

/** "the `a` dictionary is …", or "the `a` and `b` dictionaries are …". */
function clause(names: string[], when: string): string {
    return names.length > 1
        ? `the ${andList(names)} dictionaries are ${when}`
        : `the ${names[0]} dictionary is ${when}`;
}

/** Explains the columns of the README's dictionaries table. */
const dictionariesText = [
    "Each row is a setting that turns a dictionary on. The dictionary is on when all of the row's conditions match:",
    '',
    '- **locale:** `cSpell.language` includes one of these locales.',
    '- **languageId:** the file is one of these types.',
    "- **glob:** the file's path matches one of these patterns.",
    '',
    'An empty cell is no condition.',
].join('\n');

/**
 * The starter README, with the `@@inject` sections the sync fills in.
 * @param installed - for a word list, what happens once it's installed. The default doesn't name the dictionaries,
 *   because they're known only once the packages are installed.
 */
export function readme(
    answers: Answers,
    installed = 'Once this extension is installed, each dictionary is on for the file types listed below, or off until you turn it on.',
): string {
    const title = `# ${displayName(answers)}\n`;
    const requirements = inject(
        '../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json',
    );
    const dictionaries = `## Dictionaries\n\n${dictionariesText}\n\n${inject('./static/dictionaries.json#markdown', 'inject-table')}`;
    const footer = inject('../../static/footer.md');
    switch (answers.kind) {
        case 'language':
            return [
                title,
                `Adds the ${answers.friendlyName} dictionary to ${codeSpellChecker}.\n`,
                '## Installation\n',
                'After this extension is installed, it is necessary to tell the spell checker to use it.\n',
                '### Enable or Disable the Dictionary\n',
                'Run these commands with `F1` or _View -> Command Palette..._:\n',
                inject('./static/commands.json', 'inject-table'),
                inject('../../static/manual-settings.language.md#values-file=:./extension.config.json'),
                dictionaries,
                requirements,
                footer,
            ].join('\n');
        case 'wordList':
            return [
                title,
                `Adds the ${answers.friendlyName} dictionary to ${codeSpellChecker}.\n`,
                '## Installation\n',
                `${installed}\n`,
                '### Enable or Disable the Dictionary\n',
                'Run these commands with `F1` or _View -> Command Palette..._:\n',
                inject('./static/commands.json', 'inject-table'),
                dictionaries,
                requirements,
                footer,
            ].join('\n');
        case 'parser':
            return [
                title,
                `${answers.description}\n`,
                '## Installation\n',
                'The parser is on while this extension is enabled. To turn it off, use **Disable** or **Disable (Workspace)** on this extension in the Extensions view.\n',
                requirements,
                footer,
            ].join('\n');
    }
}

/**
 * The cspell config of the samples. For a language, it turns the locale on, so the tests check the sample in the
 * language. (In an inline locale comment, text after the locales on the same line, such as an HTML comment's end, is
 * read as a locale, which breaks languages that use word segmentation, such as Thai.)
 */
export function sampleConfig(answers: Answers): Record<string, unknown> {
    return answers.kind === 'language' ? { language: `${answers.locale},en` } : {};
}
