import { constants } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Answers } from './questions.mts';
import { render, type TemplateData } from './render.mts';

export const templateDir: string = path.join(import.meta.dirname, '..', 'templates');

/** Files and directories rendered as templates. */
const templates = [
    'package.json',
    'README.md',
    'CHANGELOG.md',
    'cspell-ext.json',
    'src/extension.ts',
    'samples',
    'LICENSE',
];

/** Files and directories copied as is. */
const copies = ['.vscode', 'images', '.gitignore', '.vscodeignore', 'tsconfig.json', 'cspell.config.yaml'];

export interface WriteOptions {
    /** Defaults to the generator's `templates` directory. */
    templateDir?: string;
    log?: (message: string) => void;
}

/**
 * The values the templates use.
 */
export function templateData(answers: Answers): TemplateData {
    const { kind, toggle, locale, dictionaries } = answers;
    const cspellImports = {
        dictionary: [`${answers.packageName}/cspell-ext.json`],
        parser: [`${answers.packageName}/recommended`],
        scaffold: [],
    }[kind];
    const sampleLocale = kind === 'dictionary' && toggle === 'locale' ? locale : '';
    return {
        name: answers.name,
        friendlyName: answers.friendlyName,
        displayName: answers.displayName,
        description: answers.description,
        commandName: answers.commandName,
        fullPackageName: `code-spell-checker-${answers.name}`,
        isDictionary: kind === 'dictionary',
        isParser: kind === 'parser',
        isScaffold: kind === 'scaffold',
        toggleLocale: toggle === 'locale',
        toggleDictionary: toggle === 'dictionary',
        toggleFileType: toggle === 'file-type',
        toggleLocaleOrDictionary: toggle === 'locale' || toggle === 'dictionary',
        addCommands: toggle !== 'none',
        /** The end of the command titles, i.e. `Enable Swedish Spell Checker Dictionary`. */
        commandSubject: toggle === 'file-type' ? 'Spell Checking of File Types' : 'Spell Checker Dictionary',
        locale,
        localeExample: locale || '<locale>',
        dictionariesJson: JSON.stringify(dictionaries),
        dictionaryExample: dictionaries[0] ?? '<dictionary>',
        cspellImportsJson: JSON.stringify(cspellImports),
        sampleLocale,
        sampleDictionariesJson: JSON.stringify(toggle === 'dictionary' ? dictionaries : []),
        /** The Wikipedia language of the sample text, i.e. `sv` for `sv_SE`. */
        wikiLanguage: sampleLocale.split(/[-_,]/)[0]?.toLowerCase() || 'en',
    };
}

/**
 * Write the extension files into `destDir`. Existing files are never overwritten.
 * @returns the files written, relative to `destDir`.
 */
export async function writeExtension(destDir: string, answers: Answers, options: WriteOptions = {}): Promise<string[]> {
    const srcDir = options.templateDir ?? templateDir;
    const log = options.log ?? (() => undefined);
    const data = templateData(answers);
    const written: string[] = [];

    async function create(file: string, write: (dest: string) => Promise<void>): Promise<void> {
        const dest = path.join(destDir, file);
        await mkdir(path.dirname(dest), { recursive: true });
        await write(dest);
        log(`create ${file}`);
        written.push(file);
    }

    for (const file of await listFiles(srcDir, templates)) {
        const template = await readFile(path.join(srcDir, file), 'utf8');
        await create(file, (dest) => writeFile(dest, render(template, data), { flag: 'wx' }));
    }

    for (const file of await listFiles(srcDir, copies)) {
        await create(file, (dest) => copyFile(path.join(srcDir, file), dest, constants.COPYFILE_EXCL));
    }

    return written;
}

/**
 * Expand directories into the files they contain.
 * @returns paths relative to `root`, using `/` as the separator.
 */
async function listFiles(root: string, names: string[]): Promise<string[]> {
    const files: string[] = [];
    for (const name of names) {
        const entries = await readdir(path.join(root, name), { recursive: true, withFileTypes: true }).catch(
            () => undefined,
        );
        if (!entries) {
            files.push(name);
            continue;
        }
        const found = entries
            .filter((d) => d.isFile())
            .map((d) => path.relative(root, path.join(d.parentPath, d.name)).split(path.sep).join('/'));
        files.push(...found.sort());
    }
    return files;
}
