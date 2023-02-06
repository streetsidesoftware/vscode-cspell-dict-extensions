# German - Code Spell Checker

German dictionary extension for VS Code.

Imports the German spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Enable German Spell Checker Dictionary`
- `Enable German Spell Checker Dictionary in Workspace`

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- `Disable German Spell Checker Dictionary`
- `Disable German Spell Checker Dictionary in Workspace`

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `de-de` to the `cSpell.language` setting, will enable the German dictionary.
Example using both English and German dictionaries:

```javascript
"cSpell.language": "en,de-de",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
