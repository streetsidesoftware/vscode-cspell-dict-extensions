### Manual Settings

This is done with the `language` setting.

_Preferences_ -> _Settings_

Replacing `en` with `{@ locale @}` in the `cSpell.language` setting will check {@ friendlyName @} spelling instead of
American English:

```javascript
"cSpell.language": "{@ locale @}",
```

To accept both the American and the {@ friendlyName @} spellings:

```javascript
"cSpell.language": "en,{@ locale @}",
```
