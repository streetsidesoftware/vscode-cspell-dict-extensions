# Ukrainian - Code Spell Checker

Ukrainian dictionary extension for VS Code.

Imports the Ukrainian spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

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

Adding `uk` to the `cSpell.language` setting, will enable the Ukrainian dictionary.
Example using both English and Ukrainian dictionaries:

```javascript
"cSpell.language": "en,uk",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Contributors

- [Ihor Oleksandrov](https://github.com/ihodev)

<!---
cspell:words Ihor Oleksandrov
--->

<!--- @@inject: ../../static/footer.md --->

<br/>

---

<p align="center">
Brought to you by <a href="https://streetsidesoftware.com" title="Street Side Software">
<img width="16" alt="Street Side Software Logo" src="https://i.imgur.com/CyduuVY.png" /> Street Side Software
</a>
</p>

<!--- @@inject-end: ../../static/footer.md --->
