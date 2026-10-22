#!/usr/bin/env node

/**
 * Update the extension choice lists in `.github/workflows/manual-publish.yml` and `set-prerelease.yml`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

import { listExtensionRepoPaths } from '../extension-tools/api.mts';

import { format } from './lib/format.mts';
import { repoRoot } from './lib/repo.mts';

const workflowsDir = path.join(repoRoot, '.github/workflows');

// A fixed locale, so the order doesn't depend on the machine.
const intl = new Intl.Collator('en');

async function main(): Promise<void> {
    const repoPaths = (await listExtensionRepoPaths()).sort(intl.compare);

    // Manual Publish takes the repo path, e.g. `extensions/swedish`.
    await updateExtensionOptions('manual-publish.yml', ['none', 'all', ...repoPaths]);

    // Set Prerelease takes the name, e.g. `swedish`.
    await updateExtensionOptions(
        'set-prerelease.yml',
        repoPaths.map((repoPath) => path.posix.basename(repoPath)),
    );
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

    await fs.writeFile(workflow, await format(workflow, doc.toString({ lineWidth: 120 })));
}

function assertYAMLSeq(value: unknown): asserts value is yaml.YAMLSeq<yaml.Scalar> {
    if (!(value instanceof yaml.YAMLSeq)) {
        throw new Error('Expected a YAMLSeq');
    }
}

await main();
