/**
 * The JSON schema of `extension.config.json`, generated from the `ExtensionConfig` type, and its validation.
 */

import path from 'node:path';

import { Ajv, type ValidateFunction } from 'ajv';
import * as tsj from 'ts-json-schema-generator';

import { duplicateCommandIds, type ExtensionConfig } from '../../extension-runtime/src/config.ts';

const runtimeDir = path.resolve(import.meta.dirname, '../../extension-runtime');

/** Where the generated schema is written, relative to the repository root. */
export const schemaPath = 'static/extension.config.schema.json';

/**
 * Generate the schema from `ExtensionConfig` in `extension-runtime/src/config.ts`.
 */
export function generateExtensionSchema(): tsj.Schema {
    const config: tsj.Config = {
        path: path.join(runtimeDir, 'src/config.ts'),
        tsconfig: path.join(runtimeDir, 'tsconfig.json'),
        type: 'ExtensionConfig',
        topRef: false,
        // Exported types become shared definitions, so the schema doesn't repeat them.
        expose: 'export',
        skipTypeCheck: true,
        sortProps: false,
        additionalProperties: false,
    };
    return { title: 'Extension config', ...tsj.createGenerator(config).createSchema(config.type) };
}

export type ExtensionConfigValidator = (data: unknown, file: string) => ExtensionConfig;

/**
 * Make a validator for `extension.config.json` files.
 * @param schema - the generated schema.
 */
export function createExtensionConfigValidator(schema: tsj.Schema): ExtensionConfigValidator {
    const validate: ValidateFunction = new Ajv({ allErrors: true }).compile(schema);
    return (data, file) => {
        if (!validate(data)) {
            const errors = validate.errors?.map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`) ?? [];
            throw new Error(`${file} doesn't match ${schemaPath}:\n${errors.join('\n')}`);
        }
        const config = data as ExtensionConfig;
        const duplicates = duplicateCommandIds(config);
        if (duplicates.length) {
            throw new Error(`${file}: duplicate command IDs ${duplicates.join(', ')}. Give the commands explicit IDs.`);
        }
        return config;
    };
}
