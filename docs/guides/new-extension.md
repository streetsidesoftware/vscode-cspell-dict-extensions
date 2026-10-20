# Creating an extension

<!--
audience: technical contributor
kind: guide
level: comfortable with basic git and a terminal; doesn't read or write code
-->

> [!NOTE]
> For contributors who can fork the repo and follow terminal steps. No coding needed.

**What an extension does:** an extension adds a dictionary or a parser to Code Spell Checker.

- A **dictionary extension** adds words, such as Swedish or medical terms, so Code Spell Checker accepts them.
- A **parser extension** tags the parts of a document, such as the comments, strings and identifiers of a TypeScript file, so people can choose which parts to spell check.

People install an extension from the VS Code Marketplace.

**How an extension works:** an extension includes a published package, unchanged, and tells Code Spell Checker where to find it. Dictionaries come from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts#all-dictionaries), and parsers from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers). So the package must be published first. If it isn't, add it to cspell-dicts or cspell-parsers.

1. **Install.** Fork and clone the repository, then in its root: `npm ci`.

2. **Find the package.** List them, with the extension that already includes each one:

   ```sh
   npm run list:packages -- thai        # the packages that match the words
   npm run list:packages -- --missing   # the packages no extension includes yet
   ```

   `--json` prints JSON.

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
   | What kind of extension?          | **Natural Language** for a language such as Swedish, which people turn on in their settings. **Word List** for a set of terms, such as medical terms or Vim's keywords. The suggestion is usually right. Not asked for a parser. |
   | Locale that enables the language | The language code people add to Code Spell Checker's `cSpell.language` setting, such as `sv-SE`. Natural languages only.                                                                                                         |
   | Name of … in its command titles  | Only when the extension has several languages, such as Serbian in Cyrillic and Latin script. Accept the suggestion.                                                                                                              |
   | Native name                      | The language's name in that language, such as `svenska`. Natural languages only.                                                                                                                                                 |
   | Marketplace description          | One sentence for the VS Code Marketplace. Parsers only.                                                                                                                                                                          |
   | Sample file                      | Word lists and parsers only. A file with some of the dictionary's words, or code the parser tags. Press Enter for a starter `samples/sample.md`; the checks fail until you replace its text.                                     |
   | Another article                  | Natural languages only, when Wikipedia has no article about Seattle in that language. The title of another article, in English or the language.                                                                                  |

   The generator then creates `extensions/<name>/` with all of the extension's files, and installs the dictionaries or parsers.

   For a natural language, the generator also fetches a sample text: the Wikipedia article about Seattle in that language, saved as `samples/seattle.md`.

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

   Choose **Run > Start Debugging** with the `Launch Extension` configuration. It opens a new VS Code window with the extension installed. Open the sample there, such as `seattle.md`: most words should have no squiggly line.

   ![Debug extension](../../images/debug-extension.png)

8. **Open a pull request** to `main`. After it's merged, the maintainers add the extension to the lists and release it. You don't need to do anything else.
