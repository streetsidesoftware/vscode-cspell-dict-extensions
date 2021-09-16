# Russian - Code Spell Checker

Russian dictionary extension for VS Code.

Imports the Russian spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Enable Russian Spell Checker Dictionary`
- `Enable Russian Spell Checker Dictionary in Workspace`

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Disable Russian Spell Checker Dictionary`
- `Disable Russian Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `ru` to the `cSpell.language` setting, will enable the Russian dictionary.
Example using both English and Russian dictionaries:

```javascript
"cSpell.language": "en,ru",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
