#!/usr/bin/env node

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

    const extensions = allFolders.filter((f) => f.startsWith('extension') || f === '.');
    const setOfExt = new Set(extensions);

    const workflowContent = await fs.readFile(workflow, 'utf8');

    const doc = yaml.parseDocument(workflowContent);

    /** @type {import('yaml').YAMLSeq<>} */
    const options = doc.getIn('on.workflow_dispatch.inputs.extension.options'.split('.'));

    options.items = options.items
        .filter((item) => setOfExt.has(item.value))
        .map((item) => (item.value === '.' ? item : (item.type = undefined || item)));

    const current = new Set(options.items.map((item) => item.value));

    extensions.forEach((ext) => {
        if (!current.has(ext)) {
            options.items.push(doc.createNode(ext));
        }
    });

    options.items.sort((a, b) => intl.compare(a.value, b.value));

    // console.log('%o', options);

    options.flow = false;

    await fs.writeFile(workflow, doc.toString(), 'utf8');
}

await main();
