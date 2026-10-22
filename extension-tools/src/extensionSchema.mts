/**
 * The validation of `extension.config.json`, against the schema the runtime builds from its `ExtensionConfig` type.
 */

import { Ajv } from 'ajv';
import type { ValidateFunction } from 'ajv';

import type { ExtensionConfig } from '../../extension-runtime/api.ts';
import { readJson } from './repo.mts';

/** The runtime's schema of `extension.config.json`, relative to the repository root. */
export const schemaPath = 'extension-runtime/extension.config.schema.json';

export type ExtensionConfigValidator = (data: unknown, file: string) => ExtensionConfig;

/**
 * Make a validator for `extension.config.json` files from the runtime's schema.
 */
export async function readExtensionConfigValidator(): Promise<ExtensionConfigValidator> {
    return createExtensionConfigValidator(await readJson(schemaPath));
}

/**
 * Make a validator for `extension.config.json` files.
 */
export function createExtensionConfigValidator(schema: object): ExtensionConfigValidator {
    const validate: ValidateFunction = new Ajv({ allErrors: true }).compile(schema);
    return (data, file) => {
        if (!validate(data)) {
            const errors = validate.errors?.map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`) ?? [];
            throw new Error(`${file} doesn't match ${schemaPath}:\n${errors.join('\n')}`);
        }
        const config = data as ExtensionConfig;
        const duplicates = duplicateCommandIds(config);
        if (duplicates.length) {
            throw new Error(`${file}: duplicate command IDs ${duplicates.join(', ')}. Give each command its own ID.`);
        }
        return config;
    };
}

/**
 * The command IDs used more than once. A schema can't express this.
 */
export function duplicateCommandIds(config: ExtensionConfig): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const { id } of config.commands) {
        if (seen.has(id)) duplicates.add(id);
        seen.add(id);
    }
    return [...duplicates];
}
