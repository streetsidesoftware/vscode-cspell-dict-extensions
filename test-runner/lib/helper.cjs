const path = require('path');
const vscode = require('vscode');
const assert = require('assert');
const fs = require('fs/promises');

const { esmImports } = require('./esmImport.cjs');
const { chalk, log } = require('./logger.cjs');

const { findUp } = esmImports;

const repoRoot = path.join(__dirname, '../..');

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
async function activateExtension(extId) {
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
async function loadDocument(docUri) {
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
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}

/**
 *
 * @param {DocumentContext} context
 * @param {string} content
 * @returns {Promise<boolean>}
 */
async function setTestContent(context, content) {
    const { doc, editor } = context;
    const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    return editor.edit((eb) => eb.replace(all, content));
}

/**
 * Get the extension id from `package.json`
 * @returns {Promise<string>}
 */
async function getExtensionId() {
    const extensionPackage = await readPackageJson();
    // The extensionId is `publisher.name` from package.json
    const { name = '', publisher = '' } = extensionPackage;
    return `${publisher}.${name}`;
}

const samplesDirUri = vscode.Uri.file('./samples');

/**
 *
 * @param  {string[]} pathSegments
 * @returns {Uri}
 */
function sampleWorkspaceUri(...pathSegments) {
    return vscode.Uri.joinPath(samplesDirUri, ...pathSegments);
}

function logYellow(...params) {
    const [message, ...rest] = params;
    if (!message) return log('');
    return log(chalk.yellow(message), ...rest);
}

/**
 *
 * @param {string} cwd
 * @returns {{name: string, publisher: string, version: string, [field: string]: unknown}}
 */
async function readPackageJson(cwd = process.cwd()) {
    const pkgFile = await findUp('package.json', { cwd, stopAt: repoRoot });
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

module.exports = {
    activateExtension,
    getExtensionId,
    loadDocument,
    log,
    logYellow,
    readPackageJson,
    repoRoot,
    samplesDirUri,
    sampleWorkspaceUri,
    setTestContent,
    sleep,
};
