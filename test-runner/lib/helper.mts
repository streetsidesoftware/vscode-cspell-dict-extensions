import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { color, log } from './logger.mts';

export { log };

export const repoRoot = path.join(import.meta.dirname, '../..');

export interface DocumentContext {
    doc: vscode.TextDocument;
    editor: vscode.TextEditor;
}

export interface ExtensionActivation<T> {
    ext: vscode.Extension<T>;
    extActivate: T;
    extApi: T | undefined;
}

export interface PackageJson {
    name: string;
    publisher: string;
    version: string;
    [field: string]: unknown;
}

/**
 * Activates an extension.
 * @param extId - the extension id, defaults to the extension under test.
 */
export async function activateExtension<T = unknown>(extId?: string): Promise<ExtensionActivation<T>> {
    const extensionId = extId || (await getExtensionId());
    log(`Activate: ${extensionId}`);
    try {
        const ext = vscode.extensions.getExtension<T>(extensionId);
        assert(ext);
        const extActivate = await ext.activate();
        const extApi = vscode.extensions.getExtension<T>(extensionId)?.exports;
        return {
            ext,
            extActivate,
            extApi,
        };
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function loadDocument(docUri: vscode.Uri): Promise<DocumentContext | undefined> {
    try {
        const doc = await vscode.workspace.openTextDocument(docUri);
        const editor = await vscode.window.showTextDocument(doc);
        return {
            doc,
            editor,
        };
    } catch (e) {
        console.error(e);
    }
}

export async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function setTestContent(context: DocumentContext, content: string): Promise<boolean> {
    const { doc, editor } = context;
    const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    return editor.edit((eb) => eb.replace(all, content));
}

/**
 * Get the extension id from `package.json`
 */
export async function getExtensionId(): Promise<string> {
    const extensionPackage = await readPackageJson();
    // The extensionId is `publisher.name` from package.json
    const { name = '', publisher = '' } = extensionPackage;
    return `${publisher}.${name}`;
}

export const samplesDirUri = vscode.Uri.file('./samples');

export function sampleWorkspaceUri(...pathSegments: string[]): vscode.Uri {
    return vscode.Uri.joinPath(samplesDirUri, ...pathSegments);
}

export function logYellow(message?: string, ...rest: unknown[]): void {
    if (!message) return log('');
    return log(color('yellow', message), ...rest);
}

export async function readPackageJson(
    cwd: string = process.env['EXTENSION_DEVELOPMENT_PATH'] || process.cwd(),
): Promise<PackageJson> {
    const pkgFile = await findUp('package.json', cwd, repoRoot);
    log('readPackageJson %o', { cwd, pkgFile });
    if (
        !pkgFile ||
        !path.relative(path.dirname(pkgFile), repoRoot) ||
        path.basename(path.dirname(path.dirname(pkgFile))) !== 'extensions'
    ) {
        throw Error('Extension package.json not found.');
    }
    return JSON.parse(await fs.readFile(pkgFile, 'utf8'));
}

/**
 * Search for `fileName` in `cwd` and its parent directories, up to and including `stopAt`.
 */
async function findUp(fileName: string, cwd: string, stopAt: string): Promise<string | undefined> {
    stopAt = path.resolve(stopAt);
    for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
        const file = path.join(dir, fileName);
        if (await isFile(file)) return file;
        if (dir === stopAt || dir === path.dirname(dir)) return undefined;
    }
}

async function isFile(file: string): Promise<boolean> {
    try {
        return (await fs.stat(file)).isFile();
    } catch {
        return false;
    }
}
