#!/usr/bin/env node

// @ts-check
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import * as path from 'path';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __root = path.dirname(__dirname);

const workflow = path.join(__root, '.github/workflows/manual-publish.yml');

const intl = new Intl.Collator();

async function main() {
    const workspace = JSON.parse(await fs.readFile(path.resolve(__root, 'dict-extensions.code-workspace'), 'utf-8'));

    /** @type {string[]} */
    const allFolders = workspace.folders.map((f) => f.path);

    const extensions = allFolders.filter((f) => f.startsWith('extension'));
    const setOfExt = new Set(extensions);

    const workflowContent = await fs.readFile(workflow, 'utf8');

    const doc = yaml.parseDocument(workflowContent);

    const options = doc.getIn('on.workflow_dispatch.inputs.extension.options'.split('.'));
    assertYAMLSeq(options);

    const current = new Set(options.items.map((item) => item.value));

    extensions.forEach((ext) => {
        if (!current.has(ext)) {
            options.items.push(doc.createNode(ext));
        }
    });

    options.items.sort((a, b) => compareExtensions(a.value, b.value));

    // console.log('%o', options);

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

function compareExtensions(a, b) {
    if (a === 'none') return -1;
    if (b === 'none') return 1;
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return intl.compare(a, b);
}

await main();
