#!/usr/bin/env node

/**
 * The extension tools. Run `cli.mts --help`, or `cli.mts <command> --help`.
 */

import fs from 'node:fs/promises';
import { styleText } from 'node:util';

import { Command } from 'commander';

import { addEditCommands } from './src/editCommands.mts';
import { listPackages, packagesTable } from './src/listPackages.mts';
import { syncExtensions } from './src/syncExtensions.mts';
import { articleMarkdown, fetchArticle } from './src/wikipedia.mts';

const program = new Command()
    .name('extension-tools')
    .description('Maintain the extensions in extensions/.')
    .showHelpAfterError(true);

program
    .command('sync')
    .description(
        'Write the files the sync maintains: for an extension with an extension.config.json, every derived file; ' +
            'for one without, the package.json fields every extension shares.',
    )
    .argument('[folder...]', 'folders in extensions/ (default: all of them)')
    .action(async (folders: string[]) => {
        const { changes, count } = await syncExtensions(folders, { check: false });
        for (const { folder, file, action } of changes) {
            const verb = { create: 'Created', update: 'Updated', remove: 'Removed' }[action];
            console.log(`${verb}: extensions/${folder}/${file}`);
        }
        console.log(`Synced ${plural(count, 'extension')}.`);
    });

program
    .command('check')
    .description(
        'Change nothing. Report the files the sync would change, and what the configs say that the installed ' +
            'packages no longer back up. Exit with 1 if there is anything.',
    )
    .argument('[folder...]', 'folders in extensions/ (default: all of them)')
    .action(async (folders: string[]) => {
        const { changes, drift, count } = await syncExtensions(folders, { check: true });
        for (const { folder, file } of changes) console.log(`Out of date: extensions/${folder}/${file}`);
        for (const { file, message } of drift) console.log(`${file}: ${message}`);
        console.log(`Checked ${plural(count, 'extension')}.`);
        if (changes.length) error('Run `extension-tools/cli.mts sync` and commit the changes.');
        if (drift.length)
            error('Change the commands or the locale, or the packages, so that each is defined or declared.');
    });

program
    .command('packages')
    .description('List the dictionaries in cspell-dicts and the parsers in cspell-parsers, and the extension of each.')
    .argument('[word...]', 'only the packages whose name, English name or description contains every word')
    .option('--any', 'a package may contain any of the words instead')
    .option('--missing', 'only the packages no extension includes yet, leaving out those that ship with cspell')
    .option('--json', 'print JSON instead of a table')
    .action(async (words: string[], options: { any?: boolean; missing?: boolean; json?: boolean }) => {
        const listed = await listPackages(words, options);
        if (options.json) {
            console.log(JSON.stringify(listed, null, 2));
            return;
        }
        console.log(packagesTable(listed));
        console.log(`\n${plural(listed.length, 'package')}.`);
    });

program
    .command('fetch-sample')
    .description('Fetch the lead section of a Wikipedia article as Markdown, with its source and license.')
    .argument('<locale>', 'the language, e.g. th or sv-SE')
    .argument('[title]', 'the article, in that language or in English', 'Seattle')
    .option('--out <file>', 'write to a file instead of printing')
    .action(async (locale: string, title: string, options: { out?: string }) => {
        const language = locale.split(/[-_]/)[0]!.toLowerCase();
        const article = await fetchArticle(language, title);
        if (!article) throw new Error(`No ${language}.wikipedia.org article for "${title}".`);
        const markdown = articleMarkdown(article);
        if (options.out) {
            await fs.writeFile(options.out, markdown);
            console.log(`Wrote ${options.out} from ${article.url}`);
        } else {
            process.stdout.write(markdown);
        }
    });

addEditCommands(program);

function plural(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function error(message: string): void {
    console.error(styleText('red', message, { stream: process.stderr }));
    process.exitCode = 1;
}

try {
    await program.parseAsync();
} catch (e) {
    console.error(styleText('red', e instanceof Error ? e.message : String(e), { stream: process.stderr }));
    process.exitCode = 1;
}
