import { existsSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';

import { noExtensionReason } from '../cspellPackages.mts';
import type { CSpellPackage } from '../cspellPackages.mts';
import {
    canonicalLocale,
    englishLanguageName,
    languageOf,
    mostSpecificLocale,
    nativeLanguageName,
} from './locales.mts';
import { normalizeName, toFriendlyName } from './names.mts';
import type { Prompter } from './prompt.mts';

/**
 * The `kind` in `extension.config.json`:
 * - `language`: a natural language, enabled by its locale.
 * - `wordList`: a word list, on for the file types its dictionaries name, or off until turned on with commands.
 * - `parser`: a cspell parser.
 */
export type Kind = 'language' | 'wordList' | 'parser';
export const kinds: readonly Kind[] = ['language', 'wordList', 'parser'];

export const defaultLicense = 'GPL-3.0-or-later';

/** One language of an extension with several, e.g. Serbian Cyrillic. */
export interface Language {
    /** The language's most specific locale, e.g. `sr-Cyrl`. */
    locale: string;
    /** Its name in English, used in the titles of its commands, e.g. `Serbian (Cyrillic)`. */
    name: string;
}

export interface Answers {
    /** The extension directory name and command ID prefix, e.g. `swedish`. */
    name: string;
    friendlyName: string;
    kind: Kind;
    /** The `@cspell/*` packages, e.g. `['@cspell/dict-sv']`. */
    packages: string[];
    /** A language's locale as a BCP 47 tag, e.g. `sv-SE`. Empty for other kinds. */
    locale: string;
    /** Every locale the packages declare, e.g. `['sv', 'sv-SE']`. The disable commands turn them all off. */
    locales: string[];
    /** The languages that get their own commands. Empty unless there are several. */
    languages: Language[];
    /** A language's name in the language itself, e.g. `svenska`. Empty when there is none. */
    nativeName: string;
    /** Empty for the default, `<friendlyName> - Code Spell Checker`. */
    displayName: string;
    /** Empty for the default of a language or a word list. A parser has no default. */
    description: string;
    /** An SPDX license ID. */
    license: string;
}

/** Values given on the command line. */
export interface Options {
    name?: string | undefined;
    packages?: string[] | undefined;
    kind?: Kind | undefined;
    locale?: string | undefined;
    nativeName?: string | undefined;
    friendlyName?: string | undefined;
    displayName?: string | undefined;
    description?: string | undefined;
    license?: string | undefined;
    /** Replace the extension's directory when it exists. */
    force?: boolean | undefined;
    /** Never ask: use the options and defaults, and fail when a required value is missing. */
    yes?: boolean | undefined;
}

export interface Context {
    prompter: Prompter;
    /** The dictionaries and parsers that can be included. */
    packages: readonly CSpellPackage[];
    /** Where the extensions are, e.g. `<repo>/extensions`. */
    extensionsDir: string;
    /** Packages that already have an extension, mapped to the extension directory name. */
    existing: ReadonlyMap<string, string>;
    log: (message: string) => void;
}

/** A problem with the command line options. */
export class UsageError extends Error {}

const packagePrefixes = ['@cspell/dict-', '@cspell/parser-'] as const;

const notPublished =
    'Add a dictionary to https://github.com/streetsidesoftware/cspell-dicts, ' +
    'or a parser to https://github.com/streetsidesoftware/cspell-parsers, first.';

/** What a package is, from the package lists. */
interface PackageKind {
    name: string;
    parser: boolean;
    /** A dictionary's kind and locales. */
    info?: { naturalLanguage: boolean; locales: string[] } | undefined;
}

/**
 * Ask the questions needed to generate an extension. Values given as options are not asked.
 */
export async function askQuestions(options: Options, ctx: Context): Promise<Answers> {
    const yes = !!options.yes;

    const packages = await askPackages(options, ctx);
    const name = await askName(options, ctx, normalizeName(checkPackage(packages[0] ?? '', ctx).name));
    const friendlyName =
        options.friendlyName ??
        (yes ? toFriendlyName(name) : await ctx.prompter.input('Friendly name:', toFriendlyName(name)));

    const kinds = packages.map((pkg) => packageKind(pkg, ctx));
    const kind = await askKind(kinds, options, ctx);
    if (kind !== 'language') {
        for (const [option, value] of [
            ['--locale', options.locale],
            ['--native-name', options.nativeName],
        ] as const) {
            if (value !== undefined) throw new UsageError(`${option} only applies to a language.`);
        }
    }

    const declared = kind === 'language' ? languageLocales(kinds) : [];
    const locale = kind === 'language' ? await askLocale(declared, options, ctx) : '';
    const locales = kind === 'language' ? unique([...declared.flat(), locale]) : [];
    const languages = declared.length > 1 ? await askLanguages(declared, options, ctx) : [];

    return {
        name,
        friendlyName,
        kind,
        packages,
        locale,
        locales,
        languages,
        nativeName: kind === 'language' ? await askNativeName(locale, options, ctx) : '',
        displayName: options.displayName?.trim() ?? '',
        description: kind === 'parser' ? await askDescription(options, ctx) : (options.description?.trim() ?? ''),
        license: options.license?.trim() || defaultLicense,
    };
}

function missing(option: string, why: string): never {
    throw new UsageError(`Missing ${option}: ${why}.`);
}

/** @param suggested - the default, from the first package's name, such as `swedish` for "Swedish". */
async function askName(options: Options, ctx: Context, suggested: string): Promise<string> {
    const check = (name: string): true | string => {
        if (!name) return 'Please enter a name.';
        return !options.force && existsSync(path.join(ctx.extensionsDir, name))
            ? `extensions/${name} already exists. Choose another name, or pass --force to replace it.`
            : true;
    };

    if (options.name !== undefined) {
        const name = normalizeName(options.name);
        const result = check(name);
        if (result !== true) throw new UsageError(result);
        return name;
    }
    if (options.yes) return missing('--name', 'the extension name, e.g. swedish');

    const answer = await ctx.prompter.input(
        'Extension name, e.g. "swedish" (the directory in extensions/ and the command ID prefix):',
        suggested,
        (text) => check(normalizeName(text)),
    );
    return normalizeName(answer);
}

/**
 * The packages the extension includes. Interactively: dictionaries or parsers, then a checklist of the packages of
 * that kind that have no extension yet. Packages that get no extension, such as those that ship with cspell, aren't
 * offered.
 */
async function askPackages(options: Options, ctx: Context): Promise<string[]> {
    if (options.packages?.length) {
        for (const pkg of options.packages) checkPackage(pkg, ctx);
        return unique(options.packages);
    }
    if (options.yes) return missing('--package', 'a @cspell/dict-* or @cspell/parser-* package');

    const parsers = await ctx.prompter.select(
        'Dictionaries or parsers?',
        [
            { name: 'Dictionaries', value: false, description: 'Words for a language or a topic.' },
            { name: 'Parsers', value: true, description: 'Parsers for programming languages.' },
        ],
        false,
    );
    const offered = ctx.packages
        .filter((pkg) => (parsers ? pkg.kind === 'parser' : pkg.kind === 'language' || pkg.kind === 'wordList'))
        .filter((pkg) => !noExtensionReason(pkg) && !ctx.existing.has(pkg.packageName))
        // Languages first, then word lists.
        .toSorted((a, b) => Number(a.kind !== 'language') - Number(b.kind !== 'language'));
    if (!offered.length) {
        throw new UsageError('Every package of that kind has an extension. To make another one, pass --package.');
    }
    return ctx.prompter.checkbox(
        `Packages without an extension (${offered.length}):`,
        offered.map((pkg) => ({
            name: `${pkg.packageName}: ${pkg.name}` + (parsers ? '' : styleText('gray', ` (${kindLabels[pkg.kind]})`)),
            value: pkg.packageName,
            description: pkg.description,
        })),
    );
}

const kindLabels: Record<CSpellPackage['kind'], string> = {
    language: 'language',
    wordList: 'word list',
    bundle: 'bundle',
    parser: 'parser',
};

function isCSpellPackage(name: string): boolean {
    return packagePrefixes.some((prefix) => name.startsWith(prefix));
}

/** The package in the lists. Fails when it isn't there, or gets no extension. */
function checkPackage(name: string, ctx: Context): CSpellPackage {
    if (!isCSpellPackage(name)) {
        throw new UsageError(`${name} is not a @cspell/dict-* or @cspell/parser-* package. ${notPublished}`);
    }
    const pkg = ctx.packages.find((p) => p.packageName === name);
    if (!pkg) throw new UsageError(`${name} is not in cspell-dicts or cspell-parsers. ${notPublished}`);
    const reason = noExtensionReason(pkg);
    if (reason) throw new UsageError(`${name} ${reason}, so it gets no extension.`);
    return pkg;
}

function packageKind(name: string, ctx: Context): PackageKind {
    const pkg = checkPackage(name, ctx);
    if (pkg.kind === 'bundle') throw new UsageError(`${name} is a bundle, and the generator has no bundle kind.`);
    if (name.startsWith('@cspell/parser-')) return { name, parser: true };
    return { name, parser: false, info: { naturalLanguage: pkg.kind === 'language', locales: pkg.locales } };
}

/**
 * The kind, from the packages: a parser when they are all parsers, a language when any dictionary is a natural
 * language, and otherwise a word list.
 */
async function askKind(packages: PackageKind[], options: Options, ctx: Context): Promise<Kind> {
    const parsers = packages.filter((pkg) => pkg.parser).length;
    if (parsers && parsers < packages.length) {
        throw new UsageError('An extension includes either parsers or dictionaries, not both.');
    }
    if (parsers) {
        if (options.kind && options.kind !== 'parser') {
            throw new UsageError(`--kind ${options.kind} does not match the parser packages.`);
        }
        return 'parser';
    }
    if (options.kind === 'parser') throw new UsageError('--kind parser does not match the dictionary packages.');
    if (options.kind) return options.kind;

    const derived: Kind = packages.some((pkg) => pkg.info?.naturalLanguage) ? 'language' : 'wordList';
    if (options.yes) return derived;
    const locales = unique(languageLocales(packages).flat());
    const localeList = locales.length ? ` (${locales.join(', ')})` : '';
    return ctx.prompter.select(
        'What kind of extension?',
        [
            {
                name: 'Natural Language',
                value: 'language',
                description: `Turned on by adding its locale${localeList} to cSpell.language.`,
            },
            {
                name: 'Word List',
                value: 'wordList',
                description:
                    'Terms such as medical terms. On once installed, unless its dictionary is off until turned on.',
            },
        ],
        derived,
    );
}

/** The locales of each natural language package, as BCP 47 tags. */
function languageLocales(packages: PackageKind[]): string[][] {
    return packages
        .map((pkg) => unique((pkg.info?.locales ?? []).map(canonicalLocale)))
        .filter((locales) => locales.length);
}

/**
 * The locale that enables the language. The default is the most specific locale every package declares, e.g. `sv-SE`
 * for `sv,sv_SE`, and `sr` for Serbian Cyrillic (`sr,sr-Cyrl`) with Serbian Latin (`sr,sr-Latn`).
 */
async function askLocale(declared: string[][], options: Options, ctx: Context): Promise<string> {
    if (options.locale) return canonicalLocale(options.locale);
    const shared = declared.reduce<string[]>(
        (common, locales) => common.filter((locale) => locales.includes(locale)),
        declared[0] ?? [],
    );
    const best = mostSpecificLocale(shared);
    if (options.yes) return best ?? missing('--locale', 'the packages share no locale');
    const all = unique(declared.flat());
    if (!all.length) {
        const answer = await ctx.prompter.input('Locale that enables the language, e.g. "sv-SE":', undefined, (text) =>
            text.trim() ? true : 'Please enter a locale.',
        );
        return canonicalLocale(answer);
    }
    return ctx.prompter.select(
        'Locale that enables the language:',
        all.map((locale) => ({ name: locale, value: locale })),
        best,
    );
}

/**
 * With several language packages, each gets its own commands, named after its most specific locale: `sr-Cyrl` is
 * `Serbian (Cyrillic)`.
 */
async function askLanguages(declared: string[][], options: Options, ctx: Context): Promise<Language[]> {
    const languages: Language[] = [];
    for (const locales of declared) {
        const locale = mostSpecificLocale(locales) ?? '';
        const suggested = englishLanguageName(locale) ?? locale;
        const name = options.yes
            ? suggested
            : await ctx.prompter.input(`Name of ${locale} in its command titles:`, suggested, (text) =>
                  text.trim() ? true : 'Please enter a name.',
              );
        languages.push({ locale, name: name.trim() });
    }
    return languages;
}

/**
 * Ask for the language's name in the language itself. The default is the name `Intl` gives the language, e.g.
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

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}
