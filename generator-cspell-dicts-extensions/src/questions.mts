import { existsSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';

import { classify, cspellExtUrl, type CSpellExt, type DictionaryInfo, mostSpecificLocale } from './cspellExt.mts';
import { type FetchJson, packageInfo, type PackageSummary, searchPackages } from './npm.mts';
import { canonicalLocale, languageOf, nativeLanguageName } from './locales.mts';
import { nameFromDescription, nameFromParserPackage, normalizeName, toFriendlyName } from './names.mts';
import type { Choice, Prompter } from './prompt.mts';

/**
 * - `dictionary`: wraps a `@cspell/dict-*` package from cspell-dicts.
 * - `parser`: wraps a `@cspell/parser-*` package from cspell-parsers.
 */
export type Kind = 'dictionary' | 'parser';
export const kinds: readonly Kind[] = ['dictionary', 'parser'];

/** The `kind` in `extension.config.json`. A dictionary is a natural language or a word list. */
export type ConfigKind = 'language' | 'wordList' | 'parser';

export interface Answers {
    kind: ConfigKind;
    /** The `@cspell/*` package, i.e. `@cspell/dict-sv`. */
    packageName: string;
    /** A language's locale as a BCP 47 tag, i.e. `sv-SE`. Empty for other kinds. */
    locale: string;
    /** A language's name in the language itself, i.e. `svenska`. Empty when there is none. */
    nativeName: string;
    /** The extension directory name and command ID prefix, i.e. `swedish`. */
    name: string;
    friendlyName: string;
    /** Empty for the default, `<friendlyName> - Code Spell Checker`. */
    displayName: string;
    /** Empty for the default of a language or a word list. A parser has no default. */
    description: string;
}

/** Values given on the command line. */
export interface Options {
    package?: string | undefined;
    kind?: Kind | undefined;
    naturalLanguage?: boolean | undefined;
    locale?: string | undefined;
    nativeName?: string | undefined;
    name?: string | undefined;
    friendlyName?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
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

const packagePrefixes: Record<Kind, string> = {
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

    const pkg = await askPackage(kind, options, ctx);
    let configKind: ConfigKind = 'parser';
    let locale = '';
    if (kind === 'dictionary') {
        const info = await readDictionaryInfo(pkg.name, ctx);
        if (await askNaturalLanguage(info, options, ctx)) {
            configKind = 'language';
            locale = canonicalLocale(await askLocale(info?.locales ?? [], options, ctx));
        } else {
            configKind = 'wordList';
        }
    }

    const name = await askName(kind, pkg, options, ctx);

    const friendlyName =
        options.friendlyName ??
        (yes ? toFriendlyName(name) : await prompter.input('Friendly Name:', toFriendlyName(name)));
    const nativeName = configKind === 'language' ? await askNativeName(locale, options, ctx) : '';

    return {
        kind: configKind,
        packageName: pkg.name,
        locale,
        nativeName,
        name,
        friendlyName,
        displayName: options.displayName ?? '',
        description: configKind === 'parser' ? await askDescription(options, ctx) : (options.description ?? ''),
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
        return missing('package', 'pass a @cspell/dict-* or @cspell/parser-* package');
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
    ];
    return ctx.prompter.select('What kind of extension?', choices, 'dictionary');
}

/** Reject options that do not apply to the kind. */
function checkOptionsFor(kind: Kind, options: Options): void {
    const notFor = (option: string, what: string): never => {
        throw new UsageError(`${option} only applies to ${what}.`);
    };
    if (options.naturalLanguage !== undefined && kind !== 'dictionary') {
        notFor(options.naturalLanguage ? '--natural-language' : '--no-natural-language', 'a dictionary');
    }
    for (const [option, value] of [
        ['--locale', options.locale],
        ['--native-name', options.nativeName],
    ] as const) {
        if (value !== undefined && (kind === 'parser' || options.naturalLanguage === false)) {
            notFor(option, 'a natural language dictionary');
        }
    }
}

async function askPackage(kind: Kind, options: Options, ctx: Context): Promise<PackageSummary> {
    const prefix = packagePrefixes[kind];
    if (options.package) return checkPackage(options.package, kind, ctx);
    if (options.yes) return missing('package', 'pass a @cspell/dict-* or @cspell/parser-* package');

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
async function checkPackage(name: string, kind: Kind, ctx: Context): Promise<PackageSummary> {
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

/**
 * Ask for the language's name in the language itself. The default is the name `Intl` gives the language, i.e.
 * `svenska` for `sv-SE`. An empty answer leaves it out.
 */
async function askNativeName(locale: string, options: Options, ctx: Context): Promise<string> {
    if (options.nativeName !== undefined) return options.nativeName.trim();
    const suggested = nativeLanguageName(languageOf(locale)) ?? '';
    if (options.yes) return suggested;
    const answer = await ctx.prompter.input(
        'Native name (the language in the language itself; empty for none):',
        suggested || undefined,
    );
    return answer.trim();
}

/** A parser's Marketplace description has no default. */
async function askDescription(options: Options, ctx: Context): Promise<string> {
    const given = options.description?.trim();
    if (given) return given;
    if (options.yes) return missing('--description', 'a parser has no default description');
    const answer = await ctx.prompter.input('Marketplace description:', undefined, (text) =>
        text.trim() ? true : 'Please enter a description.',
    );
    return answer.trim();
}

async function askName(kind: Kind, pkg: PackageSummary, options: Options, ctx: Context): Promise<string> {
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

    const derived = kind === 'parser' ? nameFromParserPackage(pkg.name) : nameFromDescription(pkg.description);
    if (options.yes) {
        if (!derived) {
            return missing('--name', 'no name could be derived');
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
