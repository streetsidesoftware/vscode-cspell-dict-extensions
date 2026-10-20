import { constants } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/src/config.ts';
import { languageOf } from './locales.mts';
import { type Answers, defaultLicense, type Language } from './questions.mts';
import type { Sample } from './sample.mts';

export const templateDir: string = path.join(import.meta.dirname, '..', 'templates');

/** Files copied as is from the generator's `templates` directory. `LICENSE` holds the text of the default license. */
const copies = ['images/SpellCheck.png'];

export interface WriteOptions {
    /** Defaults to the generator's `templates` directory. */
    templateDir?: string;
    log?: (message: string) => void;
}

/**
 * Write the files a person owns into `destDir`: `extension.config.json`, a starter `package.json`, `README.md`,
 * `LICENSE` and the samples. `npm run sync:extensions` writes the rest. Existing files are never overwritten.
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
 * The extension's `extension.config.json`, with its fields in the order the existing ones use. Optional fields are
 * only written when they are given.
 */
export function extensionConfig(answers: Answers, sample: string): ExtensionConfig {
    const { kind, packages } = answers;
    const optional = (key: string, value: string) => (value ? { [key]: value } : {});
    const head = { $schema: '../../static/extension.config.schema.json', name: answers.name };
    const names = { friendlyName: answers.friendlyName, ...optional('displayName', answers.displayName) };
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
                ...optional('nativeName', answers.nativeName),
                locale: answers.locale,
                ...optional('description', answers.description),
                ...tail,
                commands: localeCommands(answers),
            };
        case 'wordList':
            return { ...head, kind, ...names, ...optional('description', answers.description), ...tail, commands: [] };
        case 'parser':
            return { ...head, kind, ...names, description: answers.description, ...tail, commands: [] };
    }
}

/**
 * Enable the locale, and disable every locale the packages declare, globally and in the workspace: `sv-SE` is enabled
 * with `sv-SE` and disabled with `sv,sv-SE`. With several languages, each also gets its own commands.
 */
export function localeCommands(answers: Pick<Answers, 'name' | 'locale' | 'locales' | 'languages'>): CommandConfig[] {
    const disable = answers.locales.join(',');
    const main = scopes.flatMap((scope): CommandConfig[] => [
        { action: 'enable', toggle: 'locale', value: answers.locale, ...workspace(scope) },
        { action: 'disable', toggle: 'locale', value: disable, ...workspace(scope) },
    ]);
    return [...main, ...answers.languages.flatMap((language) => languageCommands(answers.name, language))];
}

const scopes = ['global', 'workspace'] as const;

function workspace(scope: (typeof scopes)[number]): { scope?: 'workspace' } {
    return scope === 'workspace' ? { scope } : {};
}

/**
 * The commands of one language, e.g. `cSpellExt_serbian.enableCyrl` titled `Enable Serbian (Cyrillic) Spell Checker
 * Dictionary`. The ID ends with the locale's subtags after the language, or the language when there are none.
 */
export function languageCommands(name: string, language: Language): CommandConfig[] {
    const subtags = language.locale.split('-').slice(1).join('') || languageOf(language.locale);
    const suffix = subtags.slice(0, 1).toUpperCase() + subtags.slice(1);
    return scopes.flatMap((scope) =>
        (['enable', 'disable'] as const).map((action): CommandConfig => {
            const inWorkspace = scope === 'workspace' ? 'Workspace' : '';
            const verb = action === 'enable' ? 'Enable' : 'Disable';
            return {
                action,
                toggle: 'locale',
                value: language.locale,
                ...workspace(scope),
                id: `cSpellExt_${name}.${action}${suffix}${inWorkspace}`,
                title: `${verb} ${language.name} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
            };
        }),
    );
}

/**
 * Turn a word list's dictionaries on and off, globally and in the workspace. One dictionary gets the
 * default IDs and titles; with several, each gets its own, e.g. `cSpellExt_vim.enableVimScript` and `Enable vim-script
 * Spell Checker Dictionary`.
 * @param dictionaries - the dictionary names, e.g. `['vim']`.
 */
export function dictionaryCommands(name: string, dictionaries: readonly string[]): CommandConfig[] {
    return dictionaries.flatMap((dictionary) =>
        scopes.flatMap((scope) =>
            (['enable', 'disable'] as const).map((action): CommandConfig => {
                const command: CommandConfig = { action, toggle: 'dictionary', value: dictionary, ...workspace(scope) };
                if (dictionaries.length === 1) return command;
                const inWorkspace = scope === 'workspace' ? 'Workspace' : '';
                const verb = action === 'enable' ? 'Enable' : 'Disable';
                const suffix = dictionary
                    .split(/[^\p{L}\p{N}]+/u)
                    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
                    .join('');
                return {
                    ...command,
                    id: `cSpellExt_${name}.${action}${suffix}${inWorkspace}`,
                    title: `${verb} ${dictionary} Spell Checker Dictionary${inWorkspace ? ' in Workspace' : ''}`,
                };
            }),
        ),
    );
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

/** The starter README, with the `@@inject` sections the sync fills in. */
/**
 * The starter README.
 * @param installed - for a word list, what happens once it's installed. The default doesn't name the dictionaries,
 *   because they're known only once the packages are installed.
 */
export function readme(
    answers: Answers,
    installed = 'Once this extension is installed, each dictionary is on for the file types listed below, or off until you turn it on.',
): string {
    const title = `# ${answers.displayName || `${answers.friendlyName} - Code Spell Checker`}\n`;
    const requirements = inject(
        '../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json',
    );
    const dictionaries = `## Dictionaries\n\n${inject('./static/dictionaries.json#markdown', 'inject-table')}`;
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
