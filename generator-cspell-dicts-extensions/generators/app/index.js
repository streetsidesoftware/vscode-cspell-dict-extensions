'use strict';
const Generator = require('yeoman-generator');
const yosay = require('yosay');
const path = require('path');
const { promises: fs } = require('fs');

const genName = 'generator-cspell-dicts-extensions';

function mkdirp(file) {
    return fs.mkdir(file, { recursive: true });
}

module.exports = class extends Generator {
    constructor(args, opts) {
        super(args, opts);

        this.argument('name', {
            desc: 'Name of Dictionary',
            type: String,
            required: false,
        });
    }

    async initializing() {
        if (path.basename(this.destinationPath()) === genName) {
            this.destinationRoot('..');
            this.appname = '';
        }
    }

    async prompting() {
        // Have Yeoman greet the user.
        this.log(yosay('Welcome to the VS Code Spelling Dictionary Extension generator!'));

        const prompts = [
            {
                type: 'input',
                name: 'name',
                message: 'Your extension dictionary directory name (i.e. medicalterms or german)',
                default: this.options.name,
                filter: (name) => name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            },
            {
                type: 'input',
                name: 'friendlyName',
                message: 'Friendly Name',
                default: (props) => friendlyName(props.name),
            },
            {
                type: 'input',
                name: 'displayName',
                message: 'Display Name',
                default: (props) => `${title(props.friendlyName)} - Code Spell Checker`,
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description',
                default: (props) => `${title(props.friendlyName)} dictionary extension for VS Code.`,
            },
            {
                type: 'input',
                name: 'dictionarySrc',
                message: 'Source cspell-dicts Dictionary NPM name. To be installed. i.e. @cspell/dict-name',
                default: (props) => `@cspell/dict-${props.name}`,
            },
            {
                type: 'confirm',
                name: 'addCommands',
                message: 'Add Enable / Disable Commands?',
                default: true,
            },
            {
                type: 'input',
                name: 'commandName',
                message: 'Base Name for Commands',
                default: (props) => title(props.name).replace(/[^a-z0-9]/gi, '_'),
                when: (props) => props.addCommands,
            },
            {
                type: 'input',
                name: 'locale',
                message: 'Language Locale (i.e. "en" for English or "fr" for French)',
                default: (props) => dictNameToLocal(props.dictionarySrc),
                when: (props) => props.addCommands,
            },
            {
                type: 'input',
                name: 'target',
                message: 'Target Directory',
                default: (props) => `extensions/${props.name}`,
            },
            {
                type: 'input',
                name: 'fullPackageName',
                message: 'NPM Package Name',
                default: (props) => `code-spell-checker-${props.name}`,
            },
        ];

        this.props = await this.prompt(prompts);
    }

    writing() {
        const files = [
            'package.json',
            'README.md',
            'CHANGELOG.md',
            'cspell-ext.json',
            'src/extension.ts',
            ['samples', 'samples'],
            'LICENSE',
        ];
        const filesToCopy = [
            ['.vscode', '.vscode'],
            ['images', 'images'],
            ['test', 'test'],
            '.gitignore',
            '.vscodeignore',
            'tsconfig.json',
            'cspell.config.yaml'
        ];
        files
            .map((fromTo) => (typeof fromTo === 'string' ? [fromTo, fromTo] : fromTo))
            .forEach((fromTo) => {
                const [src, dst] = fromTo;
                this.fs.copyTpl(this.templatePath(src), this.destinationPath(dst), this.props);
            });
        filesToCopy
            .map((fromTo) => (typeof fromTo === 'string' ? [fromTo, fromTo] : fromTo))
            .forEach((fromTo) => {
                const [src, dst] = fromTo;
                this.fs.copy(this.templatePath(src), this.destinationPath(dst));
            });
    }

    async default() {
        const dstDir = this.props.target;
        if (path.basename(this.destinationPath()) !== this.props.name) {
            this.log('Creating Folder: ' + this.props.name);
            await mkdirp(this.destinationPath(dstDir));
            this.destinationRoot(this.destinationPath(dstDir));
        }
    }

    install() {
        if (this.props.dictionarySrc) {
            this.spawnCommandSync('npm', ['install', '-S', this.props.dictionarySrc]);
            this.spawnCommandSync('npx', ['prettier', '-w', '**/*.{yaml,json,ts,md}']);
        }
    }

    end() {
        this.spawnCommandSync('npm', ['install']);
    }
};

function dictNameToLocal(dictModuleName) {
    return dictModuleName.replace(/^.*dict-/, '').toLowerCase();
}

function friendlyName(name) {
    const words = name.split('-').map(title);
    return words.join(' ');
}

function title(s) {
    return s[0].toUpperCase() + s.slice(1);
}
