import { readPackageJson, writePackageJson } from './packageJson.mts';

/**
 * Turn an extension's pre-release mode on or off: `vsce.preRelease` in its `package.json`.
 * @returns whether the mode changed.
 */
export async function setPreRelease(repoPath: string, preRelease: boolean): Promise<boolean> {
    const pkg = await readPackageJson(repoPath);
    const vsce = pkg.vsce ?? {};
    if (!!vsce.preRelease === preRelease) return false;

    pkg.vsce = { ...vsce, preRelease: preRelease || undefined };
    await writePackageJson(repoPath, pkg);
    return true;
}
