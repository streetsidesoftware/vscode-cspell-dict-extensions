/**
 * The validation of `extension.config.json`, against the schema the runtime builds from its `ExtensionConfig` type.
 */

import type { ExtensionConfig } from '../extension-runtime-api.mts';
import { readJson } from '../repo.mts';

/** The runtime's schema of `extension.config.json`, relative to the repository root. */
const schemaPath = 'extension-runtime/extension.config.schema.json';

export type ExtensionConfigValidator = (data: unknown, file: string) => ExtensionConfig;

/**
 * Make a validator for `extension.config.json` files from the runtime's schema.
 */
export async function readExtensionConfigValidator(): Promise<ExtensionConfigValidator> {
    // Loaded here, not at the top: workflows read configs without checking them before `npm ci` installs ajv.
    const { Ajv } = await import('ajv');
    const validate = new Ajv({ allErrors: true }).compile(await readJson<object>(schemaPath));
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
function duplicateCommandIds(config: ExtensionConfig): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const { id } of config.commands) {
        if (seen.has(id)) duplicates.add(id);
        seen.add(id);
    }
    return [...duplicates];
}
