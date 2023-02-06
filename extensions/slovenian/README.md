# Slovenian - Code Spell Checker

Slovenian dictionary extension for VS Code.

Imports the Slovenian spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Enable the language Globally or in just the Workspace.

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Disable the language Globally or in just the Workspace.

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `sl` to the `cSpell.language` setting, will enable the Slovenian dictionary.
Example using both English and Slovenian dictionaries:

```javascript
"cSpell.language": "en,sl",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Contributors

- [KrOstir](https://github.com/KrOstir)

<!--- cspell:words KrOstir --->

<!--- @@inject: ../../static/footer.md --->
