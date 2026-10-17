# Win32 - Code Spell Checker

Win32 dictionary extension for VS Code.

Imports the Win32 spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

<!--- @@inject: ../../static/requirements.md --->

## Requirements

This extension will automatically include the [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject-end: ../../static/requirements.md --->

<!--- @@inject: ../../static/engines-table.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

| Tool                                                                                                            | Version   |
| --------------------------------------------------------------------------------------------------------------- | --------- |
| [cspell](https://github.com/streetsidesoftware/cspell)                                                          | `>=10`    |
| [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | `>=4.7.0` |

<!--- @@inject-end: ../../static/engines-table.md#values-file=:../../static/engines.json&values-file=:./static/cspell-ext.json --->

## Getting Started

By default the `win32` dictionary is enabled for `C` and `C++` file types. To enable it for other file types, it is necessary to add it to the `dictionaries` section of the configuration or include it as an inline CSpell directive: `cspell:dictionaries win32`.

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
