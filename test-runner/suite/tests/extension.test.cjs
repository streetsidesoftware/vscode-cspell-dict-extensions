const assert = require('assert');
// const { before } = require('mocha');
const vscode = require('vscode');
const helper = require('../../lib/helper.cjs');

suite('Extension Test Suite 1', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Sample test', () => {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });

    test('loading the extension', async () => {
        const ext = await helper.activateExtension('streetsidesoftware.code-spell-checker');
        assert(ext, 'Extension has loaded.');
        helper.log('ext %o', ext);
    });
});
