'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');

module.exports = yeoman.Base.extend({
    prompting: function() {
        var done = this.async();

        // Have Yeoman greet the user.
        this.log(yosay(
            'Did I say 42? I wanted to say ' + chalk.blue.bold('Danf') + '! I don\'t remember the question...'
        ));

        this.log('All the following questions will help you to configure a new danf application/module ready to be shared with others.');
        this.log(chalk.grey("These data will not be used for anything else. You can check the code of this generator at https://github.com/gnodi/generator-danf\r\n"));

        var prompts = [
                {
                    type: 'input',
                    name: 'app.name',
                    message: 'The application name',
                    default: 'test'
                },
                {
                    type: 'input',
                    name: 'app.description',
                    message: 'The application description',
                    default: 'This is a danf test application'
                },
                {
                    type: 'input',
                    name: 'repository.username',
                    message: 'The username owning the repository',
                    default: 'johndorg'
                },
                {
                    type: 'input',
                    name: 'author.name',
                    message: 'Your name',
                    default: 'John Doe'
                },
                {
                    type: 'input',
                    name: 'author.email',
                    message: 'Your email',
                    default: 'john@doe.js'
                },
                {
                    type: 'input',
                    name: 'author.url',
                    message: 'The URL of your personal site or repository provider account',
                    default: 'https://johndoe.js'
                }
            ]
        ;

        this.prompt(
            prompts,
            function (props) {
                this.props = {};

                // Decode props.
                for (var key in props) {
                    var keyParts = key.split('.'),
                        currentProps = this.props
                    ;

                    for (var i = 0; i < keyParts.length; i++) {
                        var keyPart = keyParts[i];

                        if (i === keyParts.length - 1) {
                            currentProps[keyPart] = props[key];
                        } else if (undefined === this.props[keyPart]) {
                            currentProps[keyPart] = {};
                        }

                        currentProps = currentProps[keyPart]
                    }
                }

                // Build repository name.
                this.props.repository.name =
                    'danf-' +
                    this.props.repository.username +
                    '-' +
                    this.props.app.name
                ;

                // Format module name.
                this.props.module = {};
                this.props.module.id = this.props.repository.name.replace(/^danf-/, '');
                this.props.module.name = this.props.module.id.replace(/[-]([^.])/g, function(match, p1) {
                    return p1.toUpperCase();
                });

                // Generate a random unique secret.
                this.props.app.secret = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0,
                        v = c == 'x' ? r : (r&0x3 | 0x8)
                    ;

                    return v.toString(16);
                });

                // Retrieve the current year.
                var date = new Date();

                this.props.date = {'year': date.getFullYear()};

                done();
            }.bind(this)
        );
    },

    writing: {
        config: function() {
            this.fs.copy(
                this.templatePath('config'),
                this.destinationPath('config')
            );
        },

        lib: function() {
            this.fs.write(
                this.destinationPath('lib/client/.gitkeep'),
                ''
            );
            this.fs.write(
                this.destinationPath('lib/common/.gitkeep'),
                ''
            );
            this.fs.write(
                this.destinationPath('lib/server/.gitkeep'),
                ''
            );
        },

        resource: function() {
            this.fs.copy(
                this.templatePath('resource/public'),
                this.destinationPath('resource/public')
            );
            this.fs.copyTpl(
                this.templatePath('resource/private/view'),
                this.destinationPath('resource/private/view'),
                this.props
            );
        },

        test: function() {
            this.fs.copy(
                this.templatePath('test'),
                this.destinationPath('test')
            );
            this.fs.write(
                this.destinationPath('test/fixture/.gitkeep'),
                ''
            );
            this.fs.write(
                this.destinationPath('test/functional/.gitkeep'),
                ''
            );
        },

        project: function() {
            this.fs.copy(
                this.templatePath('editorconfig'),
                this.destinationPath('.editorconfig')
            );
            this.fs.copy(
                this.templatePath('gitattributes'),
                this.destinationPath('.gitattributes')
            );
            this.fs.copy(
                this.templatePath('gitignore'),
                this.destinationPath('.gitignore')
            );
            this.fs.copy(
                this.templatePath('travis.yml'),
                this.destinationPath('.travis.yml')
            );
            this.fs.copyTpl(
                this.templatePath('LICENSE'),
                this.destinationPath('LICENSE'),
                this.props
            );
            this.fs.copyTpl(
                this.templatePath('README.md'),
                this.destinationPath('README.md'),
                this.props
            );
            this.fs.copy(
                this.templatePath('Makefile'),
                this.destinationPath('Makefile')
            );
            this.fs.copyTpl(
                this.templatePath('-package.json'),
                this.destinationPath('package.json'),
                this.props
            );
            this.fs.copy(
                this.templatePath('app-dev.js'),
                this.destinationPath('app-dev.js')
            );
            this.fs.copyTpl(
                this.templatePath('app-prod.js'),
                this.destinationPath('app-prod.js'),
                this.props
            );
            this.fs.copy(
                this.templatePath('danf.js'),
                this.destinationPath('danf.js')
            );
            this.fs.copy(
                this.templatePath('gulpfile.js'),
                this.destinationPath('gulpfile.js')
            );
        }
    },

    install: function() {
        this.npmInstall();
    },

    end: function() {
        this.config.save();

        this.log(chalk.yellow.bold(
            "\r\n" +
            'Congratulations, the generation has been successful!'
        ));

        this.log(chalk.yellow(
            'The name of your danf application/module is ' +
            chalk.bold(this.props.module.name) +
            '. The recommended name for your repository is ' +
            chalk.bold(this.props.repository.name) +
            '.'
        ));

        this.log(
            'Execute ' +
            chalk.bold('node danf serve') +
            ' to start the server.'
        );
        this.log(
            'Take a look at ' +
            chalk.bold('http://localhost:3080') +
            ' now!'
        );

        this.log(chalk.green(
            'Have a great time developing with Danf!'
        ));

        this.log(chalk.grey(
            'The documentation is available at ' +
            "https://github.com/gnodi/danf/blob/master/resource/private/doc/index.md\r\n"
        ));
    }
});
