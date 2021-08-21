# Scientific Terms - Code Spell Checker

Scientific Terms dictionary extension for VS Code.

Imports the Scientific Terms spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).



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

Adding `*` to the `cSpell.language` setting, will enable the ScientificTerms dictionary.
Example using both English and Scientific Terms dictionaries:
```javascript
"cSpell.language": "en,*",
```



## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
