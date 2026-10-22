/**
 * `info`: what an extension is, read from its config, its installed packages and its samples.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import type { CommandConfig, ExtensionConfig } from '../../extension-runtime/api.ts';
import { starterMarker } from './create/sample.mts';
import { readSources } from './dictionaries.mts';
import type { Source as ConfigSource } from './dictionaries.mts';
import type { Extension } from './extensionConfig.mts';
import type { PackageJson } from './extensionHelper.mts';
import { readJson } from './repo.mts';
import { listSamples } from './samples.mts';

export interface Facts {
    folder: string;
    name: string;
    kind: ExtensionConfig['kind'];
    friendlyName: string;
    displayName: string;
    description: string;
    /** A language's primary locale. */
    locale?: string;
    nativeName?: string;
    /** The packages in `cspell.import`, then the config's own `cspell` as `extension.config.json`. */
    sources: Source[];
    commands: CommandConfig[];
    samples: { file: string; test: boolean }[];
    /** What's left to do on a new extension. */
    todo: string[];
}

export interface Source {
    /** A package name, e.g. `@cspell/dict-sv`, or `extension.config.json`. */
    name: string;
    /** The installed version, for a package. */
    version?: string;
    dictionaries: string[];
    /** The locales of its language settings. */
    locales: string[];
}

export async function readFacts({ folder, dir }: Extension, config: ExtensionConfig): Promise<Facts> {
    const sources = await Promise.all((await readSources(dir, config)).map(toSource));
    const samples = await listSamples(dir);
    return {
        folder,
        name: config.name,
        kind: config.kind,
        friendlyName: config.friendlyName,
        displayName: config.displayName,
        description: config.description,
        ...(config.kind === 'language' ? { locale: config.locale } : {}),
        ...(config.kind === 'language' && config.nativeName ? { nativeName: config.nativeName } : {}),
        sources,
        commands: config.commands,
        samples: samples.map((file) => ({ file, test: file === config.sample })),
        todo: await todo(dir, config, sources, samples),
    };
}

/** A file cspell reads, named by its package, with the package's installed version. */
async function toSource({ name, package: pkg, ext }: ConfigSource): Promise<Source> {
    const version = pkg && (await readJson<PackageJson>(path.join(pkg.dir, 'package.json'))).version;
    return {
        name: pkg?.name ?? name,
        ...(version ? { version } : {}),
        dictionaries: (ext.dictionaryDefinitions ?? []).map((definition) => definition.name),
        locales: [...new Set((ext.languageSettings ?? []).flatMap((setting) => [setting.locale ?? []].flat()))],
    };
}

/** A sample still holds the starter text; a word list's dictionary has no commands. */
async function todo(
    extensionDir: string,
    config: ExtensionConfig,
    sources: Source[],
    samples: string[],
): Promise<string[]> {
    const items: string[] = [];
    for (const sample of samples) {
        const text = await fs.readFile(path.join(extensionDir, sample), 'utf8');
        if (text.includes(starterMarker)) items.push(`Replace the starter text in ${sample}.`);
    }
    if (config.kind === 'wordList') {
        const toggled = new Set(config.commands.filter((c) => c.toggle === 'dictionary').map((c) => c.value));
        for (const dictionary of sources.flatMap((s) => s.dictionaries).filter((d) => !toggled.has(d))) {
            items.push(`Add commands for the ${dictionary} dictionary: add command --dictionary ${dictionary}`);
        }
    }
    return items;
}

/** The facts as text for a person. */
export function factsText(facts: Facts): string {
    const lines = [`${facts.folder}: ${facts.displayName} (${facts.kind})`, `  ${facts.description}`];
    if (facts.locale) lines.push(`  locale: ${facts.locale}${facts.nativeName ? ` (${facts.nativeName})` : ''}`);
    lines.push('', 'Packages:');
    for (const s of facts.sources) {
        if (s.name === 'extension.config.json' && !s.dictionaries.length && !s.locales.length) continue;
        lines.push(`  ${s.name}${s.version ? ` ${s.version}` : ''}`);
        if (s.dictionaries.length) lines.push(`    dictionaries: ${s.dictionaries.join(', ')}`);
        if (s.locales.length) lines.push(`    locales: ${s.locales.join(', ')}`);
    }
    lines.push('', 'Commands:');
    if (!facts.commands.length) lines.push('  none');
    for (const c of facts.commands) {
        const where = [c.toggle, c.value, 'scope' in c ? c.scope : ''].filter(Boolean).join(' ');
        lines.push(`  ${c.id}  ${c.title}  (${where}${c.contributes === false ? ', not listed' : ''})`);
    }
    lines.push('', 'Samples:');
    for (const s of facts.samples) lines.push(`  ${s.file}${s.test ? '  (the VS Code test opens this one)' : ''}`);
    if (facts.todo.length) lines.push('', 'To do:', ...facts.todo.map((item) => `  - ${item}`));
    return lines.join('\n');
}
