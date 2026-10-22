#!/usr/bin/env node

/**
 * Write `extension.config.schema.json`, the JSON schema of `extension.config.json`, from the `ExtensionConfig` type
 * in `src/config.ts`.
 *
 * Usage: `build-schema.mts`
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import * as tsj from 'ts-json-schema-generator';

const config: tsj.Config = {
    path: path.join(import.meta.dirname, 'src/config.ts'),
    tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    type: 'ExtensionConfig',
    topRef: false,
    // Exported types become shared definitions, so the schema doesn't repeat them.
    expose: 'export',
    skipTypeCheck: true,
    sortProps: false,
    additionalProperties: false,
};

const schema = { title: 'Extension config', ...tsj.createGenerator(config).createSchema(config.type) };
await fs.writeFile(
    path.join(import.meta.dirname, 'extension.config.schema.json'),
    JSON.stringify(schema, null, 4) + '\n',
);
