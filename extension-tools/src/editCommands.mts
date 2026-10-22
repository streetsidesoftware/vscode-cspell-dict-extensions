/**
 * The commands that read or change one extension: `info`, `add`, `remove` and `set`. Each change is checked against
 * the schema, written, and followed by the sync of that extension.
 *
 * Without the options, a command asks in the terminal. With them, it never asks, so agents and scripts can use it.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';

import { Option } from 'commander';
import type { Command } from 'commander';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { inquirerPrompter } from './create/prompt.mts';
import type { Choice, Prompter } from './create/prompt.mts';
import { findDrift } from './drift.mts';
import { addCommandSet, removeCommands, setFields } from './editConfig.mts';
import type { Fields } from './editConfig.mts';
import { pickExtension, readConfig, writeConfig } from './extensionConfig.mts';
import type { Extension } from './extensionConfig.mts';
import { factsText, readFacts } from './info.mts';
import { removeExtension } from './removeExtension.mts';
import { addSampleArticles, addSampleFiles, listSamples, removeSample } from './samples.mts';
import { syncExtensions } from './syncExtensions.mts';

const extensionOption = () =>
    new Option('-e, --extension <folder>', 'the folder in extensions/ (default: the one the command runs in)');

/** Where the paths a person types are relative to: `npm run` starts in the repository root and sets `INIT_CWD`. */
const cwd = () => process.env['INIT_CWD'] ?? process.cwd();

/** Ask only in a terminal: elsewhere a missing option is an error. */
const prompter = (): Prompter => (process.stdin.isTTY ? inquirerPrompter : noTerminal);

const noAnswer = (message: string) =>
    Promise.reject(new Error(`No terminal to ask "${message}" in. Give the option instead; see --help.`));
const noTerminal: Prompter = { input: noAnswer, confirm: noAnswer, select: noAnswer, checkbox: noAnswer };

export function addEditCommands(program: Command): void {
    program
        .command('info')
        .description('Show an extension: its packages and their dictionaries and locales, its commands and samples.')
        .addOption(extensionOption())
        .option('--json', 'print JSON')
        .action(async (options: { extension?: string; json?: boolean }) => {
            const extension = await pickExtension(options.extension);
            const facts = await readFacts(extension, await readConfig(extension.dir));
            console.log(options.json ? JSON.stringify(facts, null, 2) : factsText(facts));
        });

    const add = program.command('add').description('Add commands or samples to an extension.');
    add.command('command')
        .description(
            'Add the four standard commands, Enable and Disable, globally and in the workspace, for a locale or a ' +
                'dictionary.',
        )
        .addOption(extensionOption())
        .addOption(new Option('--dictionary <name>', 'a dictionary the packages define').conflicts('locale'))
        .option('--locale <locale>', 'a locale, e.g. sr-Cyrl')
        .option('--label <text>', 'what the titles call it (default: from the value)')
        .option('--suffix <text>', 'added to the IDs after the action (default: from the value)')
        .action(
            async (options: {
                extension?: string;
                dictionary?: string;
                locale?: string;
                label?: string;
                suffix?: string;
            }) => {
                await change(options.extension, async (extension, config) => {
                    const [toggle, value] = options.dictionary
                        ? (['dictionary', options.dictionary] as const)
                        : options.locale
                          ? (['locale', options.locale] as const)
                          : await askTarget(extension, config);
                    return addCommandSet(config, toggle, value, options);
                });
            },
        );
    add.command('sample')
        .description('Copy files into samples/, or, for a language, write Wikipedia articles there.')
        .addOption(extensionOption())
        .argument('[file...]', 'files to copy')
        .option(
            '--title <title>',
            'a Wikipedia article in the language, by its English or native title; repeat it for several',
            (value: string, previous: string[] | undefined) => [...(previous ?? []), value],
        )
        .action(async (files: string[], options: { extension?: string; title?: string[] }) => {
            const extension = await pickExtension(options.extension);
            const config = await readConfig(extension.dir);
            if (files.length && options.title) throw new Error('Give files or --title, not both.');
            if (!files.length && !options.title) {
                const answer = (await prompter().input('A file to copy, or a Wikipedia article title:')).trim();
                if (existsSync(path.resolve(cwd(), answer))) files = [answer];
                else options.title = [answer];
            }
            const added = files.length
                ? await addSampleFiles(extension.dir, files, cwd())
                : await addSampleArticles(extension.dir, languageLocale(config), options.title ?? []);
            for (const sample of added) console.log(`Added ${sample}`);
            await sync(extension);
        });

    const remove = program.command('remove').description('Remove commands, samples or an unreleased extension.');
    remove
        .command('command')
        .description('Remove commands by ID.')
        .addOption(extensionOption())
        .option('--id <id...>', 'the command IDs')
        .action(async (options: { extension?: string; id?: string[] }) => {
            await change(options.extension, async (_extension, config) => {
                const ids =
                    options.id ??
                    (await prompter().checkbox(
                        'Commands to remove:',
                        config.commands.map((c) => ({ name: `${c.title}  (${c.toggle} ${c.value})`, value: c.id })),
                    ));
                return removeCommands(config, ids);
            });
        });
    remove
        .command('sample')
        .description('Remove a sample. The test sample stays: choose another first with `set --test-sample`.')
        .addOption(extensionOption())
        .argument('[sample]', 'the sample, e.g. samples/seattle.md')
        .action(async (sample: string | undefined, options: { extension?: string }) => {
            const extension = await pickExtension(options.extension);
            const config = await readConfig(extension.dir);
            const others = (await listSamples(extension.dir)).filter((file) => file !== config.sample);
            if (!sample && !others.length) throw new Error(`No sample can be removed: only the test sample is left.`);
            const file =
                sample ??
                (await prompter().select(
                    'Sample to remove:',
                    others.map((name) => ({ name, value: name })),
                ));
            await removeSample(extension.dir, config, file);
            console.log(`Removed ${file}`);
            await sync(extension);
        });
    remove
        .command('extension')
        .description("Delete an extension's folder. Only an extension that was never released.")
        .argument('<folder>', 'the folder in extensions/')
        .option('-y, --yes', "don't ask for confirmation")
        .action(async (folder: string, options: { yes?: boolean }) => {
            const extension = await pickExtension(folder);
            if (!options.yes && !(await prompter().confirm(`Delete extensions/${folder}?`, false))) return;
            await removeExtension(extension);
            console.log(`Removed extensions/${folder}`);
        });

    program
        .command('set')
        .description("Change an extension's fields.")
        .addOption(extensionOption())
        .option(
            '--friendly-name <name>',
            'the name, e.g. Swedish; also renames the standard command titles, but not --display-name or --description',
        )
        .option('--display-name <name>', 'the Marketplace name')
        .option('--description <text>', 'the Marketplace description')
        .option('--notes <text>', 'notes for maintainers; empty removes them')
        .option('--native-name <name>', "a language's name in the language itself; empty removes it")
        .option('--locale <locale>', "a language's primary locale")
        .option('--test-sample <sample>', 'the sample the VS Code test opens, e.g. samples/seattle.md')
        .action(async (options: Omit<Fields, 'sample'> & { extension?: string; testSample?: string }) => {
            const { extension: folder, testSample, ...rest } = options;
            await change(folder, async (extension, config) => {
                let fields: Fields = { ...rest, sample: testSample };
                if (Object.values(fields).every((value) => value === undefined)) fields = await askField(config);
                if (fields.sample && !(await listSamples(extension.dir)).includes(fields.sample)) {
                    throw new Error(`${fields.sample} isn't a sample. Add it first with \`add sample\`.`);
                }
                return setFields(config, fields);
            });
        });
}

/** Read the config, change it, write it, and sync the extension. */
async function change(
    folder: string | undefined,
    edit: (extension: Extension, config: ExtensionConfig) => Promise<ExtensionConfig>,
): Promise<void> {
    const extension = await pickExtension(folder);
    const config = await edit(extension, await readConfig(extension.dir));
    // The same facts `check` reports: refuse a change that `check` would fail on.
    const drift = await findDrift(extension.dir, config);
    if (drift.length) throw new Error(`Not changed:\n${drift.map((message) => `  ${message}`).join('\n')}`);
    await writeConfig(extension.dir, config);
    console.log(`Updated extensions/${extension.folder}/extension.config.json`);
    await sync(extension);
}

async function sync(extension: Extension): Promise<void> {
    const { changes } = await syncExtensions([extension.folder], { check: false });
    for (const { file } of changes) console.log(`Updated extensions/${extension.folder}/${file}`);
}

/** Ask which locale or dictionary of the packages the commands are for. */
async function askTarget(
    extension: Extension,
    config: ExtensionConfig,
): Promise<readonly ['locale' | 'dictionary', string]> {
    type Target = readonly ['locale' | 'dictionary', string];
    const facts = await readFacts(extension, config);
    const choices = facts.sources.flatMap((source): Choice<Target>[] => [
        ...(config.kind === 'language' ? source.locales : []).map((locale) => ({
            name: `locale ${locale} (${source.name})`,
            value: ['locale', locale] as Target,
        })),
        ...source.dictionaries.map((dictionary) => ({
            name: `dictionary ${dictionary} (${source.name})`,
            value: ['dictionary', dictionary] as Target,
        })),
    ]);
    return prompter().select('Commands for:', choices);
}

const fieldNames: Record<keyof Fields, string> = {
    friendlyName: 'friendly name',
    displayName: 'display name',
    description: 'description',
    notes: 'notes',
    nativeName: 'native name',
    locale: 'locale',
    sample: 'test sample',
};

async function askField(config: ExtensionConfig): Promise<Fields> {
    const languageOnly = ['nativeName', 'locale'];
    const fields = Object.entries(fieldNames).filter(
        ([field]) => config.kind === 'language' || !languageOnly.includes(field),
    );
    const field = await prompter().select(
        'Field to change:',
        fields.map(([value, name]) => ({ name, value: value as keyof typeof fieldNames })),
    );
    const current = (config as unknown as Record<string, string | undefined>)[field];
    return { [field]: await prompter().input(`New ${fieldNames[field]}:`, current) };
}

function languageLocale(config: ExtensionConfig): string {
    if (config.kind !== 'language') throw new Error('Only a language gets Wikipedia samples. Give a file instead.');
    return config.locale;
}
