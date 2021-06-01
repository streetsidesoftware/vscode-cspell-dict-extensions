# Publishing

These extension are published to both Open VSX and VS Code Marketplace.

The goal is to publish extension via a GitHub Action.

## Manual Publishing

**OVSX**

```
OVSX_TOKEN=YOUR_TOKEN npm -p run publish-all-ovsx
```

**VS Code Marketplace**

```
npm run publish-all
```

## Tokens

**VS Code**

Follow direction on:

1. [Publishing Extensions | Visual Studio Code Extension API](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
1. VS Code: [Street Side Software on Azure](https://dev.azure.com/streetsidesoftware/)

```
npx vsce login streetsidesoftware
```
