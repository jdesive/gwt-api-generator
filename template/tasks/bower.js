"use strict";
const fs = require('fs-extra');
const globalVar = require('./global-variables');
const gulp = require('gulp');
const gutil = require('gulp-util');
const jsonfile = require('jsonfile');

require('minimist')(process.argv.slice(2));

gulp.task('bower:install', ['clean', 'bower:configure'], function () {
    gutil.log("Checking bower dependencies...");
    if (globalVar.bowerPackages) {
        return bower({cmd: 'install', cwd: globalVar.publicDir, interactive: true}, [globalVar.bowerPackages]);
    } else {
        gutil.log('No --package provided. Using package(s) from bower_components folder.');
        return gulp.src('./bower_components/**/*', {base: '.'}).pipe(gulp.dest(globalVar.publicDir));
    }
});

gulp.task('bower:configure', ['clean:resources'], function (done) {
    jsonfile.readFile('.bowerrc', function (err, obj) {
        if (!err) {
            fs.copySync('.bowerrc', globalVar.publicDir + '/.bowerrc');
            fs.copySync('bower.json', globalVar.publicDir + '/bower.json');
            if (obj.directory) {
                globalVar.bowerDir = globalVar.publicDir + '/' + obj.directory + '/';
            }
        }
        done();
    });
});