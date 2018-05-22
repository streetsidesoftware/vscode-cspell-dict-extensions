# Danish - Code Spell Checker

Danish dictionary extension for VS Code.

Imports the Danish spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).



## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Enable the language Globally or in just the Workspace.

### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `F1` `Show Spell Checker Configuration Info`
- Select the `Language` tab.
- Disable the language Globally or in just the Workspace.

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `dk` to the `cSpell.language` setting, will enable the Danish dictionary.
Example using both English and Danish dictionaries:
```javascript
"cSpell.language": "en,dk",
```



## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
