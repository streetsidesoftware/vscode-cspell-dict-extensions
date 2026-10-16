// The modules the shared tsdown config resolves for each extension. See `entry.ts`.

declare module 'extension-config' {
    /** The extension's `extension.config.json`, checked at run time by `parseExtensionConfig`. */
    const config: unknown;
    export default config;
}

declare module 'extension-custom' {
    /** The `activate` of the extension's `src/custom.ts`. See `CustomModule` in `activate.ts`. */
    export const activate:
        ((context: import('vscode').ExtensionContext, api: Promise<unknown>) => void | Promise<void>) | undefined;
}
