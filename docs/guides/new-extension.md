# Creating an extension

<!--
audience: technical contributor
kind: guide
level: comfortable with basic git and a terminal; doesn't read or write code
-->

> [!NOTE]
> For contributors who can fork the repo and follow terminal steps. No coding needed.

## What an extension does

An extension adds a dictionary or a parser to Code Spell Checker.

- A **dictionary extension** adds words, such as Swedish or medical terms, so Code Spell Checker accepts them.
- A **parser extension** tags the parts of a document, such as comments, strings and identifiers, so users can choose which parts to spell check.

VS Code users install an extension from the Marketplace.

## How an extension works

An extension includes a published package and tells Code Spell Checker where to find it. Dictionaries come from [cspell-dicts](https://github.com/streetsidesoftware/cspell-dicts#all-dictionaries), and parsers from [cspell-parsers](https://github.com/streetsidesoftware/cspell-parsers).

## How to find dictionaries and parsers

In a clone of this repository, list the packages, with the extension that already includes each one:

```sh
npm run list:packages -- thai        # the packages that match the word thai
npm run list:packages -- --missing   # the packages no extension includes yet
```

`--json` prints JSON.

## Create an extension

<!--- @@inject: ../templates/package-must-be-published.md --->

The package must be published first. To create a dictionary, see [Creating a dictionary](https://github.com/streetsidesoftware/cspell-dicts/blob/main/docs/guides/new-dictionary.md) in cspell-dicts. To create a parser, see [Adding a parser package](https://github.com/streetsidesoftware/cspell-parsers/blob/main/docs/guides/new-parser-package.md) in cspell-parsers.

<!--- @@inject-end: ../templates/package-must-be-published.md --->

<!--- @@inject: ../templates/prerequisites.md#values-file=:../../package.json --->

You need:

- [git](https://git-scm.com)
- [VS Code](https://code.visualstudio.com)
- [Node.js](https://nodejs.org) `>=24.11.0`

<!--- @@inject-end: ../templates/prerequisites.md#values-file=:../../package.json --->

Follow these steps in order:

1. **Install.** Fork and clone the repository. Then, in its root, run `npm ci`.

2. **Run the generator.** It asks a few questions, then creates the extension.

   ```sh
   npm run create:extension
   ```

   | Question                         | What to answer                                                                                                                                                                                                                  |
   | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | Extension name                   | A short lowercase name in English, such as `swedish`. It becomes the folder `extensions/swedish/`.                                                                                                                              |
   | Friendly name                    | The name shown in VS Code and the Marketplace, such as `Swedish`. Press Enter to accept the suggestion.                                                                                                                         |
   | Packages that match "swedish"    | The dictionaries or parsers to include. All matches start checked; uncheck the ones you don't want. "(has an extension)" means another extension already includes it.                                                           |
   | Search for more packages         | Another word to search for, such as a topic. Press Enter to finish.                                                                                                                                                             |
   | What kind of extension?          | **Natural Language** for a language such as Swedish, which users turn on in their settings. **Word List** for a set of terms, such as medical terms or Vim's keywords. The suggestion is usually right. Not asked for a parser. |
   | Locale that enables the language | The language code users add to Code Spell Checker's `cSpell.language` setting, such as `sv-SE`. Natural languages only.                                                                                                         |
   | Name of … in its command titles  | Only when the extension has several languages, such as Serbian in Cyrillic and Latin script. Accept the suggestion.                                                                                                             |
   | Native name                      | The language's name in that language, such as `svenska`. Natural languages only.                                                                                                                                                |
   | Marketplace description          | One sentence for the VS Code Marketplace. Parsers only.                                                                                                                                                                         |
   | Sample file                      | Word lists and parsers only. A file with some of the dictionary's words, or code the parser tags. Press Enter for a starter `samples/sample.md`; the checks fail until you replace its text.                                    |
   | Wikipedia article for the sample | Natural languages only. Press Enter for Seattle, or name another article, in English or the language. Then add more articles, or press Enter to finish. Each article becomes its own sample file, such as `samples/seattle.md`. |

   The generator then creates `extensions/<name>/` with all of the extension's files, and installs the dictionaries or parsers.

   For a natural language, the generator fetches the articles you named from that language's Wikipedia, with their source and license.

   If you already know every answer, the [generator README](../../generator-cspell-dicts-extensions/README.md) shows how to give them as options.

3. **Review `README.md`.** It becomes the extension's page on the VS Code Marketplace. The generator writes a complete README. Add anything users should know, such as where the words come from. Don't edit the sections between the `<!--- @@inject … --->` comments. They're filled in for you.

4. **Try it in VS Code.** Open the extension's folder:

   ```sh
   code extensions/<name>
   ```

   Or open the folder with **File > Open Folder**.

   Choose **Run > Start Debugging** with the `Launch Extension` configuration. It opens a new VS Code window with the extension installed.

   ![Debug extension](../../images/debug-extension.png)

5. **Check the samples.** In the new window, open each file in `samples/`. A squiggly line marks a word the dictionary doesn't know. To list them all at once, run this in a terminal, in the extension's folder:

   ```sh
   npm run test:cspell
   ```

   It prints each unknown word with its file and line. For each one:
   - For a name or a word that isn't real, add it to `words` in `samples/cspell.json`.
   - For a real word, add it to `words` too. Then ask for it in cspell-dicts. See [Adding words](../../CONTRIBUTING.md#adding-words-to-a-language-dictionary).
   - Or delete the sentence from the sample.

   For a natural language, keep the `language` setting in `samples/cspell.json`. It turns the language on for the samples.

6. **Send your extension to the maintainers.**
   - Commit the new `extensions/<name>/` folder. Push it to your fork.
   - On GitHub, open a pull request from your fork. See [Creating a pull request from a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork).
   - Title it `feat: add <Language> extension`, such as `feat: add Thai extension`.

   The pull request runs the checks. To run them first:

   ```sh
   npm run check:extension -- <name>
   ```

   After the pull request is merged, the maintainers add the extension to the lists and release it. You don't need to do anything else.
