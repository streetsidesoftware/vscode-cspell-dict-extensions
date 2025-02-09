# Galician - Code Spell Checker

Galician dictionary extension for VS Code.

Imports the Galician spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

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

Adding `gl` to the `cSpell.language` setting, will enable the Galician dictionary.
Example using both English and Galician dictionaries:

```javascript
"cSpell.language": "en,gl",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Contributors

- [Borja Paz Rodríguez](https://github.com/borjapazr)

<!--- cspell:words Borja Paz Rodríguez --->

<!--- @@inject: ../../static/footer.md --->
