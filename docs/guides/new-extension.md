# Creating an extension

<!--
audience: technical contributor
kind: guide
level: comfortable with basic git and a terminal; doesn't read or write code
-->

> [!NOTE]
> For contributors who can fork the repo and follow terminal steps. No coding needed.

An extension wraps published packages: `@cspell/dict-*` packages from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts#all-dictionaries) or `@cspell/parser-*` packages from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). If the dictionary isn't published yet, add it to cspell-dicts first.

1. **Install.** Fork and clone the repository, then in its root: `npm ci`.

2. **Find the package.** List them, with the extension that already includes each one:

   ```sh
   npm run list:packages -- thai        # the packages that match the words
   npm run list:packages -- --missing   # the packages no extension includes yet
   ```

   `--json` prints JSON. Check the package's license (see [Licenses](../licenses.md)).

3. **Run the generator.** It asks a few questions, then creates the extension.

   ```sh
   npm run create:extension
   ```

   | Question                         | What to answer                                                                                                                                                                                                                   |
   | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Extension name                   | A short lowercase name in English, such as `swedish`. It becomes the folder `extensions/swedish/`.                                                                                                                               |
   | Friendly name                    | The name people see, such as `Swedish`. Press Enter to accept the suggestion.                                                                                                                                                    |
   | Packages that match "swedish"    | The dictionaries or parsers to include. All matches start checked; uncheck the ones you don't want. "(has an extension)" means another extension already includes it.                                                            |
   | Search for more packages         | Another word to search for, such as a topic. Press Enter to finish.                                                                                                                                                              |
   | What kind of extension?          | **Natural Language** for a language such as Swedish, which people turn on in their settings. **Word List** for terms that are on once installed, such as medical terms. The suggestion is usually right. Not asked for a parser. |
   | Locale that enables the language | The language code people add to Code Spell Checker's `cSpell.language` setting, such as `sv-SE`. Natural languages only.                                                                                                         |
   | Name of … in its command titles  | Only when the extension has several languages, such as Serbian in Cyrillic and Latin script. Accept the suggestion.                                                                                                              |
   | Native name                      | The language's name in that language, such as `svenska`. Natural languages only.                                                                                                                                                 |
   | Marketplace description          | One sentence for the VS Code Marketplace. Parsers only.                                                                                                                                                                          |

   The generator then creates `extensions/<name>/` with all of the extension's files, and installs the dictionaries or parsers.

   For a natural language, the generator also fetches a sample text: the Wikipedia article about Seattle in that language. If that article doesn't exist, the generator says so; write a short sample by hand in `samples/seattle.md`.

   The generator doesn't ask for a license: the extension gets `GPL-3.0-or-later`. For another license, see [Licenses](../licenses.md).

   If you already know every answer, the [generator README](../../generator-cspell-dicts-extensions/README.md) shows how to give them as options.

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

   Or open the folder with **File > Open Folder**.

   Choose **Run > Start Debugging** with the `Launch Extension` configuration. It opens a new VS Code window with the extension installed. Open `samples/seattle.md` there: most words should have no squiggly line.

   ![Debug extension](../../images/debug-extension.png)

8. **Open a pull request** to `main`. After it's merged, the maintainers add the extension to the lists and release it. You don't need to do anything else.
