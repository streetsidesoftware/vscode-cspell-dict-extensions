# Serbian - Code Spell Checker

Serbian dictionary extension for VS Code.

Imports the Serbian (both Cyrillic and Latin) spellchecking dictionaries for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionaries

- `F1` `Show Spell Checker Configuration Info` (or click on the "Spell" icon in the status bar)
- Enable the language globally in the `User` tab or in just in the `Workspace` tab.

![Selected dictionaries in the Spell Checker User Tab](https://i.imgur.com/78LApWC.png)

### Disable Dictionaries

- `F1` `Show Spell Checker Configuration Info` (or click on the "Spell" icon in the status bar)
- Disable the language globally in the `User` tab or in just in the `Workspace` tab.

### Enable/disable dictionaries via commands

You can also use commands (`F1` or _View -> Command Palette..._) to enable Serbian dictionaries.

![Commands dropdown for enabling and disabling Serbian dictionaries](https://i.imgur.com/3DPWwFV.png)

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `sr` to the `cSpell.language` setting, will enable the Serbian dictionaries, both Cyrillic and Latin.

Example using both English and Serbian dictionaries:

```javascript
"cSpell.language": "en,sr",
```

To enable only Cyrillic or Latin, use the specific locales: `sr-Cyrl` or `sr-Latn`.

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.
