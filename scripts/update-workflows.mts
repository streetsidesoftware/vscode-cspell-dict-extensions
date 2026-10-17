#!/usr/bin/env node

/**
 * Update the extension choice lists in `.github/workflows/manual-publish.yml` and `set-prerelease.yml`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

import { listExtensionDirs, repoRoot, run } from './lib/repo.mts';

const workflowsDir = path.join(repoRoot, '.github/workflows');

const intl = new Intl.Collator();

async function main(): Promise<void> {
    const extensions = (await listExtensionDirs()).sort(intl.compare);

    // Manual Publish takes the extension path, i.e. `extensions/swedish`.
    await updateExtensionOptions('manual-publish.yml', ['none', 'all', ...extensions]);

    // Set Prerelease takes the directory name in `extensions/`, i.e. `swedish`.
    await updateExtensionOptions(
        'set-prerelease.yml',
        extensions.map((ext) => path.posix.basename(ext)),
    );

    run('npx', ['prettier', '-w', '.github/workflows/manual-publish.yml', '.github/workflows/set-prerelease.yml']);
}

/**
 * Replace the options of the `extension` choice input of a workflow.
 * @param workflowFile - file name in `.github/workflows`
 * @param values - the options, in order
 */
async function updateExtensionOptions(workflowFile: string, values: string[]): Promise<void> {
    const workflow = path.join(workflowsDir, workflowFile);

    const workflowContent = await fs.readFile(workflow, 'utf8');

    const doc = yaml.parseDocument(workflowContent);

    const options = doc.getIn('on.workflow_dispatch.inputs.extension.options'.split('.'));
    assertYAMLSeq(options);

    options.items = values.map((value) => doc.createNode(value));
    options.flow = false;

    await fs.writeFile(workflow, doc.toString({ lineWidth: 120 }), 'utf8');
}

function assertYAMLSeq(value: unknown): asserts value is yaml.YAMLSeq<yaml.Scalar> {
    if (!(value instanceof yaml.YAMLSeq)) {
        throw new Error('Expected a YAMLSeq');
    }
}

await main();
