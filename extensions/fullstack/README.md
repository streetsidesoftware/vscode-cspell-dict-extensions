# Fullstack - Code Spell Checker

fullstack dictionary extension for VS Code.

Imports the fullstack spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

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

Adding `fullstack` to the `cSpell.language` setting, will enable the fullstack ipsum dictionary.
Example using both English and fullstack ipsum dictionaries:

```javascript
"cSpell.language": "en,fullstack",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
