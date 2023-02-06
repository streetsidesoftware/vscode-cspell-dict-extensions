# Czech - Code Spell Checker

Czech dictionary extension for VS Code.

Imports the Czech spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

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

Adding `cs` to the `cSpell.language` setting, will enable the Czech dictionary.
Example using both English and Czech dictionaries:

```javascript
"cSpell.language": "en,cs",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Contributors

- [Zereges](https://github.com/Zereges)

<!--- cspell:words Zereges --->

<!--- @@inject: ../../static/footer.md --->
