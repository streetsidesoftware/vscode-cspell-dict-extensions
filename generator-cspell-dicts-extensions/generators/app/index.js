'use strict';
const Generator = require('yeoman-generator');
const yosay = require('yosay');
const path = require('path');
const mkdirp = require('mkdirp');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);

    this.argument('name', {
      desc: 'Name of Dictionary',
      type: String,
      required: true
    });
  }

  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(
      'Welcome to the VS Code Spelling Dictionary Extension generator!'
    ));

    const prompts = [
      {
        type: 'input',
        name: 'name',
        message: 'Your extension dictionary name (i.e. medicalterms)',
        default: this.options.name || this.appname, // Default to current folder name
        filter: name => name.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      },
      {
        type: 'input',
        name: 'friendlyName',
        message: 'Friendly Name',
        default: props => title(props.name) || this.options.name // Default to current folder name
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Display Name',
        default: props => `${title(props.friendlyName)} - Code Spell Checker`
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description',
        default: props => `${title(props.friendlyName)} dictionary extension for VS Code.`
      },
      {
        type: 'input',
        name: 'dictionarySrc',
        message: 'Source cspell-dicts Dictionary NPM name. To be installed.',
        default: props => `cspell-dict-${props.name}`
      },
      {
        type: 'confirm',
        name: 'addCommands',
        message: 'Add Enable / Disable Commands?',
        default: false
      },
      {
        type: 'input',
        name: 'commandName',
        message: 'Base Name for Commands',
        default: props => title(props.name).replace(/[^a-z0-9]/gi, '_'),
        when: props => props.addCommands
      },
      {
        type: 'input',
        name: 'local',
        message: 'Language Local (i.e. "en" for English or "fr" for French)',
        default: props => props.dictionarySrc.split('-').pop().slice(0, 2),
        when: props => props.addCommands
      },
      {
        type: 'input',
        name: 'target',
        message: 'Target Directory',
        default: props => `extensions/${props.name}`
      },
      {
        type: 'input',
        name: 'fullPackageName',
        message: 'NPM Package Name',
        default: props => `code-spell-checker-${props.name}`
      }
    ];

    return this.prompt(prompts).then(props => {
      this.props = props;
      return props;
    });
  }

  writing() {
    const files = [
      'package.json',
      'README.md',
      'CHANGELOG.md',
      'src/extension.ts',
      'LICENSE'
    ];
    const filesToCopy = [
      ['.vscode', '.vscode'],
      ['images', 'images'],
      ['test', 'test'],
      '.gitignore',
      '.vscodeignore',
      'tsconfig.json',
      'vsc-extension-quickstart.md'
    ];
    files
      .map(fromTo => typeof fromTo === 'string' ? [fromTo, fromTo] : fromTo)
      .forEach(fromTo => {
        const [src, dst] = fromTo;
        this.fs.copyTpl(
          this.templatePath(src),
          this.destinationPath(dst),
          this.props
        );
      });
    filesToCopy
      .map(fromTo => typeof fromTo === 'string' ? [fromTo, fromTo] : fromTo)
      .forEach(fromTo => {
        const [src, dst] = fromTo;
        this.fs.copy(
          this.templatePath(src),
          this.destinationPath(dst)
        );
      });
  }

  default() {
    const dstDir = this.props.target;
    if (path.basename(this.destinationPath()) !== this.props.name) {
      this.log(
        'Creating Folder: ' + this.props.name
      );
      mkdirp(this.destinationPath(dstDir));
      this.destinationRoot(this.destinationPath(dstDir));
    }
  }

  install() {
    if (this.props.dictionarySrc) {
      this.npmInstall(this.props.dictionarySrc, {save: true});
    }

    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false,
      callback: () => {
        this.spawnCommand('npm', ['run', 'build']);
      }
    });
  }
};

function title(s) {
  return s[0].toUpperCase() + s.slice(1);
}

