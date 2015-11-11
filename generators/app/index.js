'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');

module.exports = yeoman.generators.Base.extend({
    prompting: function() {
        var done = this.async();

        // Have Yeoman greet the user.
        this.log(yosay(
            'Welcome to the shining ' + chalk.red('Danf') + ' generator!'
        ));

        var prompts = [
                {
                    type: 'input',
                    name: 'author.name',
                    message: 'Author name?'
                },
                {
                    type: 'input',
                    name: 'app.name',
                    message: 'App name?'
                },
                {
                    type: 'input',
                    name: 'repository.name',
                    message: 'Repository name?'
                }
            ]
        ;

        this.prompt(
            prompts,
            function (props) {
                this.props = {};

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

                done();
            }.bind(this)
        );
    },

    writing: {
        app: function() {
            this.fs.copy(
                this.templatePath('_package.json'),
                this.destinationPath('package.json')
            );
        },

        projectfiles: function() {
            // Handle config.
            this.fs.copy(
                this.templatePath('config'),
                this.destinationPath('config')
            );

            // Handle lib.
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

            // Handle resource.
            this.fs.copy(
                this.templatePath('resource/public/css'),
                this.destinationPath('resource/public/css')
            );
            this.fs.copyTpl(
                this.templatePath('resource/private/view'),
                this.destinationPath('resource/private/view'),
                this.props
            );

            // Handle test.
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

            // Handle main.
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
            this.fs.copy(
                this.templatePath('app-prod.js'),
                this.destinationPath('app-prod.js')
            );
            this.fs.copy(
                this.templatePath('danf-client.js'),
                this.destinationPath('danf-client.js')
            );
            this.fs.copy(
                this.templatePath('danf-server.js'),
                this.destinationPath('danf-server.js')
            );
        }
    },

    install: function() {
        this.installDependencies();
    }
});
