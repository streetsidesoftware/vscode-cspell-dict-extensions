#!/usr/bin/env node

// @ts-check
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import * as path from 'path';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.dirname(__dirname);

const workflowsDir = path.join(__root, '.github/workflows');

const intl = new Intl.Collator();

async function main() {
    const workspace = JSON.parse(await fs.readFile(path.resolve(__root, 'dict-extensions.code-workspace'), 'utf-8'));

    /** @type {string[]} */
    const allFolders = workspace.folders.map((f) => f.path);

    const extensions = allFolders.filter((f) => f.startsWith('extension')).sort(intl.compare);

    // Manual Publish takes the extension path, i.e. `extensions/swedish`.
    await updateExtensionOptions('manual-publish.yml', ['none', 'all', ...extensions]);

    // Set Prerelease takes the directory name in `extensions/`, i.e. `swedish`.
    await updateExtensionOptions(
        'set-prerelease.yml',
        extensions.map((ext) => path.posix.basename(ext)),
    );
}

/**
 * Replace the options of the `extension` choice input of a workflow.
 * @param {string} workflowFile - file name in `.github/workflows`
 * @param {string[]} values - the options, in order
 */
async function updateExtensionOptions(workflowFile, values) {
    const workflow = path.join(workflowsDir, workflowFile);

    const workflowContent = await fs.readFile(workflow, 'utf8');

    const doc = yaml.parseDocument(workflowContent);

    const options = doc.getIn('on.workflow_dispatch.inputs.extension.options'.split('.'));
    assertYAMLSeq(options);

    options.items = values.map((value) => doc.createNode(value));
    options.flow = false;

    await fs.writeFile(workflow, doc.toString({ lineWidth: 120 }), 'utf8');
}

/**
 * @param {unknown} value
 * @returns {asserts value is import('yaml').YAMLSeq<import('yaml').Scalar>}
 */
function assertYAMLSeq(value) {
    if (!(value instanceof yaml.YAMLSeq)) {
        throw new Error('Expected a YAMLSeq');
    }
}

await main();
