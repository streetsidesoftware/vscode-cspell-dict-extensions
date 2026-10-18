import { constants } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/src/config.ts';
import { languageOf } from './locales.mts';
import type { Answers } from './questions.mts';

export const templateDir: string = path.join(import.meta.dirname, '..', 'templates');

/** Files copied as is from the generator's `templates` directory. */
const copies = ['LICENSE', 'images/SpellCheck.png'];

/** The sample the VS Code test opens. */
const sample = 'samples/seattle.md';

export interface WriteOptions {
    /** Defaults to the generator's `templates` directory. */
    templateDir?: string;
    log?: (message: string) => void;
}

/**
 * Write the files a person owns into `destDir`: `extension.config.json`, a starter `package.json`, `README.md`,
 * `LICENSE` and the samples. `npm run sync:extensions` writes the rest. Existing files are never overwritten.
 * @returns the files written, relative to `destDir`.
 */
export async function writeExtension(destDir: string, answers: Answers, options: WriteOptions = {}): Promise<string[]> {
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
        ['extension.config.json', json(extensionConfig(answers))],
        ['package.json', json(packageJson(answers))],
        ['README.md', readme(answers)],
        [sample, sampleText(answers)],
        ['samples/cspell.json', json({})],
    ];
    for (const [file, content] of files) {
        await create(file, (dest) => writeFile(dest, content, { flag: 'wx' }));
    }
    for (const file of copies) {
        await create(file, (dest) => copyFile(path.join(srcDir, file), dest, constants.COPYFILE_EXCL));
    }
    return written;
}

function json(value: unknown): string {
    return JSON.stringify(value, null, 4) + '\n';
}

/**
 * The extension's `extension.config.json`, with its fields in the order the existing ones use. Optional fields are
 * only written when they are given.
 */
export function extensionConfig(answers: Answers): ExtensionConfig {
    const { kind, packageName } = answers;
    const optional = (key: string, value: string) => (value ? { [key]: value } : {});
    const head = { $schema: '../../static/extension.config.schema.json', name: answers.name };
    const names = { friendlyName: answers.friendlyName, ...optional('displayName', answers.displayName) };
    const tail = {
        sample,
        cspell: { import: [kind === 'parser' ? `${packageName}/recommended` : `${packageName}/cspell-ext.json`] },
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
                commands: localeCommands(answers.locale),
            };
        case 'wordList':
            return { ...head, kind, ...names, ...optional('description', answers.description), ...tail, commands: [] };
        case 'parser':
            return { ...head, kind, ...names, description: answers.description, ...tail, commands: [] };
    }
}

/**
 * Enable the locale, and disable it together with its language, globally and in the workspace, as most language
 * extensions do: `sv-SE` is enabled with `sv-SE`, and disabled with `sv,sv-SE`.
 */
export function localeCommands(locale: string): CommandConfig[] {
    const language = languageOf(locale);
    const disable = language === locale ? locale : `${language},${locale}`;
    return (['global', 'workspace'] as const).flatMap((scope) => [
        { action: 'enable', toggle: 'locale', value: locale, ...(scope === 'workspace' ? { scope } : {}) },
        { action: 'disable', toggle: 'locale', value: disable, ...(scope === 'workspace' ? { scope } : {}) },
    ]);
}

/**
 * The fields of `package.json` a person owns. `npm install` adds the dependency, and the sync and
 * `fix-extensions` fill in the rest.
 */
export function packageJson(answers: Answers): Record<string, unknown> {
    return {
        name: `code-spell-checker-${answers.name}`,
        version: '0.0.1',
        license: 'GPL-3.0-or-later',
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
export function readme(answers: Answers): string {
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
                `Once this extension is installed, the ${answers.friendlyName} dictionary is automatically used.\n`,
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

/** The sample the tests spell check. A language's sample turns its locale on. */
export function sampleText(answers: Answers): string {
    const language = answers.kind === 'language' ? languageOf(answers.locale) : 'en';
    const lines = [
        ...(answers.kind === 'language' ? [`<!-- cspell:locale ${language},en -->`, ''] : []),
        '# Seattle',
        '',
        `Replace this text with the Wikipedia article about Seattle: https://${language}.wikipedia.org/wiki/Seattle`,
        '',
    ];
    return lines.join('\n');
}
