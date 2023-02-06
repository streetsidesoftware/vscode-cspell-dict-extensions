# Dutch / Nederlands - Code Spell Checker

Dutch / Nederlands dictionary extension for VS Code.

Imports the Dutch / Nederlands spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Enable Dutch Spell Checker Dictionary`
- `Enable Dutch Spell Checker Dictionary in Workspace`

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Disable Dutch Spell Checker Dictionary`
- `Disable Dutch Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `nl` to the `cSpell.language` setting, will enable the Dutch dictionary.
Example using both English and Dutch dictionaries:

```javascript
"cSpell.language": "en,nl",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject: ../../static/footer.md --->
