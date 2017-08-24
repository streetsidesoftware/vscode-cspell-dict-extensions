# German - Code Spell Checker

German dictionary extension for VS Code.

Imports the German spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).



## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Enable German Spell Checker Dictionary`
- `Enable German Spell Checker Dictionary in Workspace`


### Disable Dictionary

Commands (use `F1` or *View -> Command Palette...*):
- `Disable German Spell Checker Dictionary`
- `Disable German Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

*Preferences* -> *Settings*

Adding `de` to the `cSpell.language` setting, will enable the German dictionary.
Example using both English and German dictionaries:
```javascript
"cSpell.language": "en,de",
```



## Requirements
This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
