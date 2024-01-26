import { createRequire } from 'module';
import { suite, test } from 'mocha';
import { expect, assert } from 'chai';
import { stream } from 'kefir';
import helper from '../../lib/helper.cjs';
import { resolve, basename } from 'path';

const require = createRequire(import.meta.url);

const { Uri, window, Position, languages } = require('vscode');

const { loadDocument, logYellow, log, sleep, activateExtension } = helper;

const sampleDoc = process.env['SAMPLE_TEST_DOCUMENT'];
const uriSampleDoc = Uri.file(resolve(sampleDoc));

/**
 * @typedef {import('../types').OnSpellCheckDocumentStep} OnSpellCheckDocumentStep
 * @typedef {import('vscode').Uri} Uri
 */

const timeoutInSeconds = 120;

suite('Extension Test Suite 1', function () {
    this.timeout(timeoutInSeconds * 1000);

    window.showInformationMessage('Start all tests.');

    this.beforeAll(async () => {
        // await helper.activateExtension('streetsidesoftware.code-spell-checker');
        // await helper.activateExtension();
    });

    test('loading the spell checker extension', async () => {
        const ext = await activateExtension('streetsidesoftware.code-spell-checker');
        assert(ext, 'Spell Checker Extension has loaded.');
    });

    test('loading the dictionary extension', async () => {
        const ext = await activateExtension();
        assert(ext, 'Dictionary Extension has loaded.');
    });

    test('reading the sample file.', async () => {
        logYellow('Verifies reading the sample file: %s.', sampleDoc);
        const result = await loadDocument(uriSampleDoc);
        const urlDoc = result?.doc.uri.toString(true);
        assert(result?.doc, 'Must be able to load the document.');
        assert(urlDoc.endsWith(basename(sampleDoc)), 'matches sample doc');
    });

    test('Opening the sample document and making sure there are no errors.', async () => {
        logYellow('Opening the sample document and making sure there are no errors.');
        const docContext = await loadDocument(uriSampleDoc);
        expect(docContext).to.not.be.undefined;
        await sleep(500);
        // Force a spell check by making an edit, no errors are expected.
        const pEdit0 = docContext.editor.edit((edit) => edit.insert(new Position(0, 0), '\n'));
        const pWait0 = waitForSpellComplete(uriSampleDoc, 5000);
        await pEdit0;
        const found0 = await pWait0;
        log('found %o', found0);
        expect(found0.numIssues).to.equal(0);

        // Force a spelling error
        log('doc: %o', { uri: docContext.doc.uri.toString(), version: docContext.doc.version });
        await docContext.editor.edit((edit) => edit.insert(new Position(0, 0), 'spellling\n'));
        log('doc: %o', { uri: docContext.doc.uri.toString(), version: docContext.doc.version });
        await sleep(500);
        log('doc: %o', { uri: docContext.doc.uri.toString(), version: docContext.doc.version });
        const pEdit1 = docContext.editor.edit((edit) => edit.insert(new Position(0, 0), '\n'));
        log('doc: %o', { uri: docContext.doc.uri.toString(), version: docContext.doc.version });
        const pWait1 = waitForSpellComplete(uriSampleDoc, 5000);
        await pEdit1;
        const found1 = await pWait1;
        log('found %o', found1);
        log('doc: %o', { uri: docContext.doc.uri.toString(), version: docContext.doc.version });
        expect(found1.numIssues).to.equal(1);

        const diags = await getDiagsFromVsCode(uriSampleDoc, 2000);

        // if (diags.length) {
        //     log('all diags: %o', vscode.languages.getDiagnostics());
        // }

        // await sleep(5 * 1000);
        const msgs = diags.map(({ source, message }) => ({ source, message }));
        log(`Diag Messages: size(${diags.length}) msg: %o`, msgs);
        // log('diags: %o', diags);

        // cspell:ignore spellling
        expect(JSON.stringify(msgs)).contains('spellling');
        logYellow('Done: Verifies that some spelling errors were found');
    });

    it('Wait a bit', async () => {
        // This is useful for debugging and you want to see the VS Code UI.
        // Set `secondsToWait` to 30 or more.
        const secondsToWait = 1;
        await sleep(secondsToWait * 1000);
        expect(true).to.be.true;
    });
});

/**
 *
 * @param {CSpellClient} cSpellClient
 * @returns {import('kefir').Stream<OnSpellCheckDocumentStep, undefined>}
 */
function streamOnSpellCheckDocumentNotification(cSpellClient) {
    return stream((emitter) => {
        const d = cSpellClient.onSpellCheckDocumentNotification(emitter.value);
        return () => d.dispose();
    });
}

/**
 *
 * @param {Uri} uri
 * @param {number} timeout
 * @returns {Promise<OnSpellCheckDocumentStep | undefined>}
 */
async function waitForSpellComplete(uri, timeout) {
    const matchUri = uri.toString();
    const ext = await activateExtension('streetsidesoftware.code-spell-checker');
    const s = streamOnSpellCheckDocumentNotification(ext.extApi.cSpellClient())
        .filter((v) => v.uri === matchUri)
        .filter((v) => !!v.done)
        // .map((a) => (log('waitFor 1 %o', a), a))
        .debounce(100)
        // .map((a) => (log('waitFor 2 %o', a), a))
        .take(1);
    return Promise.race([s.toPromise(), sleep(timeout)]);
}

/**
 *
 * @param {Uri} uri
 * @param {number} waitInMs
 * @returns {Promise<vscode.Diagnostic[]>}
 */
async function getDiagsFromVsCode(uri, waitInMs) {
    let stop = false;
    const h = setInterval(() => (stop = true), waitInMs);
    try {
        let diag = languages.getDiagnostics(uri);
        while (!stop && !diag.length) {
            await sleep(5);
            diag = languages.getDiagnostics(uri);
        }
        return diag;
    } finally {
        clearInterval(h);
    }
}
