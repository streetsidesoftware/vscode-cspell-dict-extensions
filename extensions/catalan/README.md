# Catalan - Code Spell Checker

Catalan dictionary extension for VS Code.

Imports the Catalan spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

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

Adding `ca` to the `cSpell.language` setting, will enable the Catalan dictionary.
Example using both English and Catalan dictionaries:

```javascript
"cSpell.language": "en,ca",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Contributors

- [Jordi Olivares Provencio](https://github.com/jordiolivares)

<!--- cspell:words Jordi Olivares Provencio --->

<!--- @@inject: ../../static/footer.md --->
