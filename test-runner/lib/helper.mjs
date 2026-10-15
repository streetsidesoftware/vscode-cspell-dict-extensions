import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import * as vscode from 'vscode';

import { color, log } from './logger.mjs';

export { log };

export const repoRoot = path.join(import.meta.dirname, '../..');

/**
 * @typedef {import('vscode').Extension} Extension
 * @typedef {import('vscode').TextDocument} TextDocument
 * @typedef {import('vscode').TextEditor} TextEditor
 * @typedef {import('vscode').Uri} Uri
 * @typedef {{doc: TextDocument, editor: TextEditor}} DocumentContext
 */

// export interface ExtensionActivation {
//     ext: vscode.Extension<ExtensionApi>;
//     extActivate: ExtensionApi;
//     extApi: ExtensionApi;
// }

/**
 * Activates the spell checker extension
 * @param {string | undefined} extId
 * @returns {Promise<{ ext: Extension, extActivate: any, extApi: any }>}
 */
export async function activateExtension(extId) {
    const extensionId = extId || (await getExtensionId());
    await log(`Activate: ${extensionId}`);
    try {
        const ext = vscode.extensions.getExtension(extensionId);
        assert(ext);
        const extActivate = await ext.activate();
        const extApi = vscode.extensions.getExtension(extensionId)?.exports;
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

/**
 * Activates the spell checker extension
 */

/**
 *
 * @param {Uri} docUri
 * @returns {Promise<DocumentContext | undefined}
 */
export async function loadDocument(docUri) {
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

/**
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

/**
 *
 * @param {DocumentContext} context
 * @param {string} content
 * @returns {Promise<boolean>}
 */
export async function setTestContent(context, content) {
    const { doc, editor } = context;
    const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    return editor.edit((eb) => eb.replace(all, content));
}

/**
 * Get the extension id from `package.json`
 * @returns {Promise<string>}
 */
export async function getExtensionId() {
    const extensionPackage = await readPackageJson();
    // The extensionId is `publisher.name` from package.json
    const { name = '', publisher = '' } = extensionPackage;
    return `${publisher}.${name}`;
}

export const samplesDirUri = vscode.Uri.file('./samples');

/**
 *
 * @param  {string[]} pathSegments
 * @returns {Uri}
 */
export function sampleWorkspaceUri(...pathSegments) {
    return vscode.Uri.joinPath(samplesDirUri, ...pathSegments);
}

export function logYellow(...params) {
    const [message, ...rest] = params;
    if (!message) return log('');
    return log(color('yellow', message), ...rest);
}

/**
 *
 * @param {string} cwd
 * @returns {{name: string, publisher: string, version: string, [field: string]: unknown}}
 */
export async function readPackageJson(cwd = process.env['EXTENSION_DEVELOPMENT_PATH'] || process.cwd()) {
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
 * @param {string} fileName
 * @param {string} cwd
 * @param {string} stopAt
 * @returns {Promise<string | undefined>}
 */
async function findUp(fileName, cwd, stopAt) {
    stopAt = path.resolve(stopAt);
    for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
        const file = path.join(dir, fileName);
        if (await isFile(file)) return file;
        if (dir === stopAt || dir === path.dirname(dir)) return undefined;
    }
}

/**
 * @param {string} file
 * @returns {Promise<boolean>}
 */
async function isFile(file) {
    try {
        return (await fs.stat(file)).isFile();
    } catch {
        return false;
    }
}
