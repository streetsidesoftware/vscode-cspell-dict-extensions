# Win32 - Code Spell Checker

Win32 dictionary extension for VS Code.

Imports the Win32 spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

### Enable or Disable the Dictionary

Run these commands with `F1` or _View -> Command Palette..._:

<!--- @@inject-table: ./static/commands.json --->

| Command                                             | What       | Value | Scope     |
| --------------------------------------------------- | ---------- | ----- | --------- |
| Enable Win32 Spell Checker Dictionary               | dictionary | win32 | global    |
| Disable Win32 Spell Checker Dictionary              | dictionary | win32 | global    |
| Enable Win32 Spell Checker Dictionary in Workspace  | dictionary | win32 | workspace |
| Disable Win32 Spell Checker Dictionary in Workspace | dictionary | win32 | workspace |

<!--- @@inject-end: ./static/commands.json --->

## Dictionaries

<!--- @@inject: ../../static/dictionaries-columns.md --->

Each row is a setting that turns a dictionary on. The dictionary is on when all of the row's conditions match:

- **locale:** `cSpell.language` includes one of these locales.
- **languageId:** the file is one of these types.
- **glob:** the file's path matches one of these patterns.

An empty cell, or `*`, is no condition.

<!--- @@inject-end: ../../static/dictionaries-columns.md --->

<!--- @@inject-table: ./static/dictionaries.json#markdown --->

| Dictionary | locale | languageId | glob |
| ---------- | ------ | ---------- | ---- |
| `win32`    | `*`    | `c`, `cpp` |      |

<!--- @@inject-end: ./static/dictionaries.json#markdown --->

<!--- @@inject: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

## Requirements

This extension will automatically include the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

| Tool                                                                                                            | Version   |
| --------------------------------------------------------------------------------------------------------------- | --------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10`    |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.7.0` |

<!--- @@inject-end: ../../static/requirements.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

## Getting Started

By default the `win32` dictionary is enabled for `C` and `C++` file types. To enable it for other file types, run **Enable Win32 Spell Checker Dictionary**, add it to the `dictionaries` section of the configuration, or include it as an inline CSpell directive: `cspell:dictionaries win32`.

Example: `example.md`

````markdown
Sample Code:

```cpp
    // Parse the command line parameters
    int argc;
    LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    pSample->ParseCommandLineArgs(argv, argc);
    LocalFree(argv);
```

<!--- cspell:dictionaries win32 --->
````

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">
Copyright © 2017-2026 Street Side Software
</p>

<p align="center">
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
