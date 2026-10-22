import { readExtensionPackageJson, writeExtensionPackageJson } from './extensionHelper.mts';

/**
 * Turn an extension's pre-release mode on or off: `vsce.preRelease` in its `package.json`.
 * @returns whether the mode changed.
 */
export async function setPreRelease(repoPath: string, preRelease: boolean): Promise<boolean> {
    const pkg = await readExtensionPackageJson(repoPath);
    const vsce = pkg.vsce ?? {};
    if (!!vsce.preRelease === preRelease) return false;

    pkg.vsce = { ...vsce, preRelease: preRelease || undefined };
    await writeExtensionPackageJson(repoPath, pkg);
    return true;
}
