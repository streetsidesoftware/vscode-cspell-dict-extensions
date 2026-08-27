# Belarusian - Code Spell Checker

Belarusian dictionary extension for VS Code.

Imports the Belarusian spell checking dictionary for [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

The bundled dictionary is generated from the Belarusian Hunspell dictionary files `be-BY.aff` and `be-BY.dic` from the [National Corpus of the Belarusian Language spell checker](https://bnkorpus.info/spell.html).

## Installation

After this extension is installed, it is necessary to tell the spell checker to use it.

### Enable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- Enable Belarusian Spell Checker Dictionary
- Enable Belarusian Spell Checker Dictionary in Workspace

### Disable Dictionary

Commands (use `F1` or _View -> Command Palette..._):

- Disable Belarusian Spell Checker Dictionary
- Disable Belarusian Spell Checker Dictionary in Workspace

### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Adding `be` to the `cSpell.language` setting, will enable the Belarusian dictionary.
Example using both English and Belarusian dictionaries:

```javascript
"cSpell.language": "en,be",
```

## Requirements

This extension will automatically include [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) extension.

## Апісанне па-беларуску

Беларускі слоўнік для VS Code.

Пашырэнне дадае беларускі слоўнік праверкі правапісу для [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

Убудаваны слоўнік згенераваны з беларускіх файлаў Hunspell `be-BY.aff` і `be-BY.dic`, атрыманых з [сайта Нацыянальнага корпуса беларускай мовы](https://bnkorpus.info/spell.html).

## Усталяванне

### Уключыць слоўнік

Каманды (выкарыстоўвайце `F1` або _View -> Command Palette..._):

- Enable Belarusian Spell Checker Dictionary
- Enable Belarusian Spell Checker Dictionary in Workspace

### Адключыць слоўнік

Каманды (выкарыстоўвайце `F1` або _View -> Command Palette..._):

- Disable Belarusian Spell Checker Dictionary
- Disable Belarusian Spell Checker Dictionary in Workspace

### Ручныя налады

Робіцца праз параметр `language` у наладах арыгінальнага пашырэння [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

_Preferences_ -> _Settings_

Дадайце `be` у параметр `cSpell.language`, каб уключыць беларускі слоўнік.
Прыклад выкарыстання англійскага і беларускага слоўнікаў разам:

```javascript
"cSpell.language": "en,be",
```

## Патрабаванні

Аўтаматычна падключае пашырэнне [Code Spell Checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker).

<!--- @@inject: ../../static/footer.md --->
