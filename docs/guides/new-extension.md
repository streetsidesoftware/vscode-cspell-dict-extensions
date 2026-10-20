# Creating an extension

<!--
audience: technical contributor
kind: guide
level: comfortable with basic git and a terminal; doesn't read or write code
-->

> [!NOTE]
> For contributors who can fork the repo and follow terminal steps. No coding needed.

An extension wraps published packages: `@cspell/dict-*` packages from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts#all-dictionaries) or `@cspell/parser-*` packages from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). A new dictionary is added to cspell-dicts first.

1. **Install.** Fork and clone the repository, then in its root: `npm ci`.

2. **Find the package.** List them, with the extension that already wraps each one:

   ```sh
   npm run list:packages -- thai        # the packages that match the words
   npm run list:packages -- --missing   # the packages no extension wraps yet
   ```

   `--json` prints JSON. Check the package's license (see [Licenses](../licenses.md)).

3. **Run the generator:**

   ```sh
   npm run create:extension
   ```

   It asks for the extension's name, i.e. `swedish`, offers the packages that match it, and suggests the rest from the packages. With the name, the packages and `--yes`, it asks nothing: `npm run create:extension -- swedish --package @cspell/dict-sv --yes`. The [generator README](../../generator-cspell-dicts-extensions/README.md) lists the options. It writes `extension.config.json` and the starter files into `extensions/<name>/`, installs the package and runs the sync. For a language, the sample is the Wikipedia article about Seattle in that language, with its source and license.

4. **Check the sample.** `samples/cspell.json` turns the language on, and the tests check that the dictionary recognizes the sample. Add the words it doesn't know, such as names, to `samples/cspell.json`, or shorten the sample. For another article, run `npm run fetch:sample -- <locale> [title] --out extensions/<name>/samples/seattle.md`.

5. **Edit `README.md`.** Change the text, and keep the `@@inject` markers: the sync fills those sections in.

6. **Run the checks:** the build, the sample check, the sync check, Prettier and the spell check, with `--vscode` for the VS Code test too:

   ```sh
   npm run check:extension -- <name> --vscode
   ```

7. **Try it in VS Code.** Open the extension's folder:

   ```sh
   code extensions/<name>
   ```

   Choose **Run > Start Debugging** with the `Launch Extension` configuration. It opens a new VS Code window with the extension installed. Open `samples/seattle.md` there: most words should have no squiggly line.

   ![Debug extension](../../images/debug-extension.png)

8. **Open a pull request** to `main`. After it's merged, a workflow adds the extension to the workspace, the README lists, release-please and the publish workflows.
