The **enabled** column says when a dictionary is used:

- **yes:** for every file.
- **conditional:** when all of the row's conditions match. An empty cell is no condition.
- **no:** only after it is turned on, with its Enable command or in `cSpell.dictionaries`.

The conditions:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.
