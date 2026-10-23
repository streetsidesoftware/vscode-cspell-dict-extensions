/*
 * Only `node:` modules here: workflows run the scripts that use it before `npm ci`.
 */

export interface ExtensionsToTest {
    /** The repo paths of the extensions to build and test. */
    extensions: string[];
    /** Whether a file outside the extension directories changed, so the jobs that test all extensions run too. */
    shared: boolean;
}

/**
 * Which extensions a change needs to test.
 *
 * - A file in an extension's directory, its README and CHANGELOG included (`vsce package` checks them), tests that
 *   extension.
 * - A Markdown file outside `extensions/`, or a file in `.github/` other than the test workflow, tests nothing.
 * - Any other file tests every extension.
 * @param changedFiles - the repo paths of the changed files.
 * @param extensionRepoPaths - the repo paths of all extensions, from `listExtensionRepoPaths`.
 */
export function extensionsToTest(changedFiles: string[], extensionRepoPaths: string[]): ExtensionsToTest {
    const extensions = new Set<string>();
    for (const file of changedFiles) {
        const extension = extensionRepoPaths.find((repoPath) => file.startsWith(repoPath + '/'));
        if (extension) {
            extensions.add(extension);
            continue;
        }
        if (file.startsWith('.github/') && file !== '.github/workflows/test.yml') continue;
        if (file.endsWith('.md') && !file.startsWith('extensions/')) continue;
        return { extensions: extensionRepoPaths, shared: true };
    }
    return { extensions: extensionRepoPaths.filter((repoPath) => extensions.has(repoPath)), shared: false };
}
