import { existsSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';

import { classify, cspellExtUrl, type CSpellExt, type DictionaryInfo, mostSpecificLocale } from './cspellExt.mts';
import { type FetchJson, packageInfo, type PackageSummary, searchPackages } from './npm.mts';
import { nameFromDescription, nameFromParserPackage, normalizeName, title, toFriendlyName } from './names.mts';
import type { Choice, Prompter } from './prompt.mts';

/**
 * - `dictionary`: wraps a `@cspell/dict-*` package from cspell-dicts.
 * - `parser`: wraps a `@cspell/parser-*` package from cspell-parsers.
 * - `scaffold`: the extension without a package, for the contributor to fill in.
 */
export type Kind = 'dictionary' | 'parser' | 'scaffold';
export const kinds: readonly Kind[] = ['dictionary', 'parser', 'scaffold'];

/**
 * What the enable / disable commands toggle.
 * - `locale`: a locale in `cSpell.language`.
 * - `dictionary`: dictionary names in `cSpell.dictionaries`.
 * - `file-type`: file types, through Code Spell Checker's `enableLanguageId`.
 * - `none`: no commands; VS Code's Disable / Disable (Workspace) turns the extension off.
 */
export type Toggle = 'locale' | 'dictionary' | 'file-type' | 'none';
export type ScaffoldToggle = Exclude<Toggle, 'none'>;
export const scaffoldToggles: readonly ScaffoldToggle[] = ['locale', 'dictionary', 'file-type'];

export interface Answers {
    kind: Kind;
    /** The `@cspell/*` package, i.e. `@cspell/dict-sv`. Empty for a scaffold. */
    packageName: string;
    toggle: Toggle;
    /** The locale to toggle, i.e. `sv_SE`. Empty unless `toggle` is `locale`; a scaffold may leave it empty. */
    locale: string;
    /** The dictionaries to toggle. Empty unless `toggle` is `dictionary`; a scaffold may leave it empty. */
    dictionaries: string[];
    /** The extension directory name and command ID prefix, i.e. `swedish`. */
    name: string;
    friendlyName: string;
    displayName: string;
    description: string;
    /** Used in the command titles. */
    commandName: string;
}

/** Values given on the command line. */
export interface Options {
    package?: string | undefined;
    kind?: Kind | undefined;
    naturalLanguage?: boolean | undefined;
    locale?: string | undefined;
    toggle?: ScaffoldToggle | undefined;
    name?: string | undefined;
    friendlyName?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    commandName?: string | undefined;
    /** Never ask: use the options and defaults, and fail when a required value is missing. */
    yes?: boolean | undefined;
}

export interface Context {
    prompter: Prompter;
    fetchJson: FetchJson;
    /** Where the extensions are, i.e. `<repo>/extensions`. */
    extensionsDir: string;
    /** Packages that already have an extension, mapped to the extension directory name. */
    existing: ReadonlyMap<string, string>;
    log: (message: string) => void;
}

/** A problem with the command line options. */
export class UsageError extends Error {}

const packagePrefixes: Record<Exclude<Kind, 'scaffold'>, string> = {
    dictionary: '@cspell/dict-',
    parser: '@cspell/parser-',
};

const notPublished = {
    dictionary:
        'Add the dictionary to https://github.com/streetsidesoftware/cspell-dicts first (see its create-dictionary).',
    parser: 'Add the parser to https://github.com/streetsidesoftware/cspell-parsers first.',
};

/**
 * Ask the questions needed to generate an extension. Values given as options are not asked.
 */
export async function askQuestions(options: Options, ctx: Context): Promise<Answers> {
    const { prompter } = ctx;
    const yes = !!options.yes;

    const kind = await askKind(options, ctx);
    checkOptionsFor(kind, options);

    let pkg: PackageSummary | undefined;
    let toggle: Toggle = 'none';
    let locale = '';
    let dictionaries: string[] = [];

    if (kind === 'scaffold') {
        toggle = await askScaffoldToggle(options, ctx);
        locale = toggle === 'locale' ? (options.locale ?? '') : '';
    } else {
        pkg = await askPackage(kind, options, ctx);
        if (kind === 'dictionary') {
            const info = await readDictionaryInfo(pkg.name, ctx);
            const natural = await askNaturalLanguage(info, options, ctx);
            if (natural) {
                toggle = 'locale';
                locale = await askLocale(info?.locales ?? [], options, ctx);
            } else {
                toggle = 'dictionary';
                dictionaries = await askDictionaries(info, options, ctx);
            }
        }
    }

    const name = await askName(kind, pkg, options, ctx);

    const friendlyName =
        options.friendlyName ??
        (yes ? toFriendlyName(name) : await prompter.input('Friendly Name:', toFriendlyName(name)));
    const friendly = title(friendlyName);
    const what = { dictionary: 'dictionary extension', parser: 'parser extension', scaffold: 'extension' }[kind];

    return {
        kind,
        packageName: pkg?.name ?? '',
        toggle,
        locale,
        dictionaries,
        name,
        friendlyName,
        displayName: options.displayName ?? `${friendly} - Code Spell Checker`,
        description: options.description ?? `${friendly} ${what} for VS Code.`,
        commandName: options.commandName ?? friendly,
    };
}

function missing(option: string, why: string): never {
    throw new UsageError(`Missing ${option}: ${why}.`);
}

/** The kind of a package, from its name. */
export function kindOfPackage(packageName: string): Kind | undefined {
    if (packageName.startsWith(packagePrefixes.dictionary)) return 'dictionary';
    if (packageName.startsWith(packagePrefixes.parser)) return 'parser';
    return undefined;
}

async function askKind(options: Options, ctx: Context): Promise<Kind> {
    const fromPackage = options.package ? kindOfPackage(options.package) : undefined;
    if (options.kind === 'scaffold' && options.package) {
        throw new UsageError('A scaffold has no package. Remove the package or --kind scaffold.');
    }
    if (options.package && !fromPackage) {
        throw new UsageError(
            `${options.package} is not a @cspell/dict-* or @cspell/parser-* package. ` +
                `${notPublished.dictionary} ${notPublished.parser}`,
        );
    }
    if (options.kind && fromPackage && options.kind !== fromPackage) {
        throw new UsageError(`--kind ${options.kind} does not match the package ${options.package}.`);
    }
    const kind = options.kind ?? fromPackage;
    if (kind) return kind;
    if (options.yes) {
        return missing('package', 'pass a @cspell/dict-* or @cspell/parser-* package, or --kind scaffold');
    }

    const choices: Choice<Kind>[] = [
        {
            name: 'Dictionary',
            value: 'dictionary',
            description: `A @cspell/dict-* package from cspell-dicts. Not published yet? ${notPublished.dictionary}`,
        },
        {
            name: 'Parser',
            value: 'parser',
            description: `A @cspell/parser-* package from cspell-parsers. Not published yet? ${notPublished.parser}`,
        },
        {
            name: 'Scaffold',
            value: 'scaffold',
            description: 'The extension without a package, with enable / disable commands to fill in.',
        },
    ];
    return ctx.prompter.select('What kind of extension?', choices, 'dictionary');
}

/** Reject options that do not apply to the kind. */
function checkOptionsFor(kind: Kind, options: Options): void {
    const notFor = (option: string, what: string): never => {
        throw new UsageError(`${option} only applies to ${what}.`);
    };
    if (options.toggle && kind !== 'scaffold') notFor('--toggle', 'a scaffold');
    if (options.naturalLanguage !== undefined && kind !== 'dictionary') {
        notFor(options.naturalLanguage ? '--natural-language' : '--no-natural-language', 'a dictionary');
    }
    if (options.locale && kind === 'parser') notFor('--locale', 'a dictionary or a scaffold');
    if (options.locale && kind === 'scaffold' && options.toggle && options.toggle !== 'locale') {
        notFor('--locale', 'a scaffold with --toggle locale');
    }
    if (options.locale && options.naturalLanguage === false) {
        notFor('--locale', 'a natural language dictionary');
    }
}

async function askScaffoldToggle(options: Options, ctx: Context): Promise<ScaffoldToggle> {
    if (options.toggle) return options.toggle;
    if (options.yes) return missing('--toggle', 'a scaffold needs the kind of toggle: locale, dictionary or file-type');
    const descriptions: Record<ScaffoldToggle, string> = {
        locale: 'Add or remove a locale in cSpell.language.',
        dictionary: 'Add or remove dictionaries in cSpell.dictionaries.',
        'file-type': 'Enable or disable spell checking of file types.',
    };
    return ctx.prompter.select(
        'What should the enable / disable commands toggle? The value is filled in later.',
        scaffoldToggles.map((value) => ({ name: value, value, description: descriptions[value] })),
        'locale',
    );
}

async function askPackage(kind: 'dictionary' | 'parser', options: Options, ctx: Context): Promise<PackageSummary> {
    const prefix = packagePrefixes[kind];
    if (options.package) return checkPackage(options.package, kind, ctx);

    let list: PackageSummary[] | undefined;
    try {
        list = await searchPackages(prefix, ctx.fetchJson);
    } catch (e) {
        ctx.log(styleText('yellow', `Could not search npm (${errorMessage(e)}). Type the package name instead.`));
    }

    if (!list?.length) {
        const typed = await ctx.prompter.input(`Package name (${prefix}<name>):`, undefined, (answer) =>
            answer.trim().startsWith(prefix) ? true : `The package name starts with ${prefix}`,
        );
        return checkPackage(typed.trim(), kind, ctx);
    }

    const packages = list;
    return ctx.prompter.search(`Search for the ${kind} (type a language or topic):`, (term) =>
        filterPackages(packages, term, ctx.existing).map((pkg) => ({
            name: pkg.name + (ctx.existing.has(pkg.name) ? styleText('gray', ' (has an extension)') : ''),
            value: pkg,
            description: pkg.description,
        })),
    );
}

/**
 * The packages that match the search term, by name or description. Packages that already have an extension come last.
 */
export function filterPackages(
    packages: readonly PackageSummary[],
    term: string,
    existing: ReadonlyMap<string, string>,
): PackageSummary[] {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = packages.filter((pkg) => {
        const text = `${pkg.name} ${pkg.description}`.toLowerCase();
        return words.every((word) => text.includes(word));
    });
    return [...matches.filter((pkg) => !existing.has(pkg.name)), ...matches.filter((pkg) => existing.has(pkg.name))];
}

/** Check that the package exists. Without a network connection, continue: `npm install` checks it later. */
async function checkPackage(name: string, kind: 'dictionary' | 'parser', ctx: Context): Promise<PackageSummary> {
    let info: PackageSummary | undefined;
    try {
        info = await packageInfo(name, ctx.fetchJson);
    } catch (e) {
        ctx.log(styleText('yellow', `Could not check ${name} on npm (${errorMessage(e)}).`));
        return { name, description: '' };
    }
    if (!info) throw new UsageError(`${name} was not found on npm. ${notPublished[kind]}`);
    return info;
}

async function readDictionaryInfo(packageName: string, ctx: Context): Promise<DictionaryInfo | undefined> {
    try {
        return classify((await ctx.fetchJson(cspellExtUrl(packageName))) as CSpellExt);
    } catch (e) {
        ctx.log(styleText('yellow', `Could not read the cspell-ext.json of ${packageName} (${errorMessage(e)}).`));
        return undefined;
    }
}

async function askNaturalLanguage(info: DictionaryInfo | undefined, options: Options, ctx: Context): Promise<boolean> {
    if (options.naturalLanguage !== undefined) return options.naturalLanguage;
    if (options.locale) return true;
    if (options.yes) {
        return info
            ? info.naturalLanguage
            : missing('--natural-language or --no-natural-language', 'the cspell-ext.json could not be read');
    }
    return ctx.prompter.confirm(
        'Is it a natural language dictionary? (Enabled by locale, rather than a word list.)',
        info?.naturalLanguage ?? true,
    );
}

async function askLocale(locales: string[], options: Options, ctx: Context): Promise<string> {
    if (options.locale) return options.locale;
    const best = mostSpecificLocale(locales);
    if (options.yes) return best ?? missing('--locale', 'the dictionary does not declare a locale');
    if (!best) {
        return ctx.prompter.input('Locale to enable (i.e. "sv" or "fr-90"):', undefined, (answer) =>
            answer.trim() ? true : 'Please enter a locale.',
        );
    }
    return ctx.prompter.select(
        'Locale for the enable / disable commands (the most specific one avoids enabling other dictionaries):',
        locales.map((locale) => ({ name: locale, value: locale })),
        best,
    );
}

async function askDictionaries(info: DictionaryInfo | undefined, options: Options, ctx: Context): Promise<string[]> {
    if (info?.dictionaries.length) return info.dictionaries;
    if (options.yes) throw new UsageError('Could not find the dictionary names in the cspell-ext.json of the package.');
    const answer = await ctx.prompter.input('Dictionary names to toggle, separated by commas:', undefined, (text) =>
        splitList(text).length ? true : 'Please enter at least one dictionary name.',
    );
    return splitList(answer);
}

function splitList(text: string): string[] {
    return text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

async function askName(kind: Kind, pkg: PackageSummary | undefined, options: Options, ctx: Context): Promise<string> {
    const check = (name: string): true | string => {
        if (!name) return 'Please enter a name.';
        return existsSync(path.join(ctx.extensionsDir, name))
            ? `extensions/${name} already exists. Choose another name.`
            : true;
    };

    if (options.name !== undefined) {
        const name = normalizeName(options.name);
        const result = check(name);
        if (result !== true) throw new UsageError(`--name ${options.name}: ${result}`);
        return name;
    }

    const derived =
        kind === 'parser' && pkg
            ? nameFromParserPackage(pkg.name)
            : pkg?.description
              ? nameFromDescription(pkg.description)
              : '';
    if (options.yes) {
        if (!derived) {
            return missing('--name', kind === 'scaffold' ? 'a scaffold needs a name' : 'no name could be derived');
        }
        const result = check(derived);
        if (result !== true) throw new UsageError(`${result} Pass --name.`);
        return derived;
    }

    const answer = await ctx.prompter.input(
        'Extension name (the directory in extensions/ and the command ID prefix):',
        derived || undefined,
        (text) => check(normalizeName(text)),
    );
    return normalizeName(answer);
}

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}
