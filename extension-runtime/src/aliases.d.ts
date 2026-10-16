// The modules the shared tsdown config resolves for each extension. See `entry.ts`.

declare module 'extension-config' {
    /** The extension's `extension.config.json`. `npm run sync:extensions` checks it against the schema of this type. */
    const config: import('./config.ts').ExtensionConfig;
    export default config;
}

declare module 'extension-custom' {
    /** The `activate` of the extension's `src/custom.ts`, if it has one. */
    export const activate: import('./activate.ts').CustomModule['activate'];
}
