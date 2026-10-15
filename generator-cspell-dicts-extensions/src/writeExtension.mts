import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Answers } from './questions.mts';
import { render } from './render.mts';

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
    /**
     * Called when a file already exists with different content.
     * @param file - the path relative to the destination.
     * @returns true to overwrite the file.
     */
    confirmOverwrite: (file: string) => Promise<boolean>;
    log?: (message: string) => void;
}

/**
 * Write the extension files into `destDir`.
 * @returns the files written, relative to `destDir`.
 */
export async function writeExtension(destDir: string, answers: Answers, options: WriteOptions): Promise<string[]> {
    const srcDir = options.templateDir ?? templateDir;
    const log = options.log ?? (() => undefined);
    const data = { ...answers };
    const written: string[] = [];

    const entries = [
        ...(await listFiles(srcDir, templates)).map((file) => ({ file, isTemplate: true })),
        ...(await listFiles(srcDir, copies)).map((file) => ({ file, isTemplate: false })),
    ];

    for (const { file, isTemplate } of entries) {
        const src = await readFile(path.join(srcDir, file));
        const content = isTemplate ? Buffer.from(render(src.toString('utf8'), data)) : src;
        const dest = path.join(destDir, file);

        const existing = await readFile(dest).catch(() => undefined);
        if (existing?.equals(content)) {
            log(`identical ${file}`);
            continue;
        }
        if (existing && !(await options.confirmOverwrite(file))) {
            log(`skip ${file}`);
            continue;
        }

        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, content);
        log(`${existing ? 'force' : 'create'} ${file}`);
        written.push(file);
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
