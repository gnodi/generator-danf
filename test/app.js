'use strict';

var path = require('path'),
    yo = require('yeoman-generator'),
    os = require('os');
;

var assert = yo.assert,
    helpers = yo.test
;

describe('danf:app', function () {
    before(function (done) {
        helpers.run(path.join(__dirname, '../generators/app'))
            .withOptions({ skipInstall: true })
            .withPrompts({ someOption: true })
            .on('end', done)
        ;
    });

    it('creates files', function () {
        assert.file([
            'package.json',
            '.editorconfig'
        ]);
    });
});
