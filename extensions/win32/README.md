# Win32 - Code Spell Checker

Win32 dictionary extension for VS Code.

Imports the Win32 spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

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
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
