"use strict";
const fs = require('fs-extra');
const globalVar = require('./global-variables');
const gulp = require('gulp');

require('minimist')(process.argv.slice(2));

gulp.task('clean', ['clean:target', 'clean:resources']);

gulp.task('clean:target', function () {
    fs.removeSync(globalVar.clientDir + 'element');
    fs.removeSync(globalVar.clientDir + 'widget');
});

gulp.task('clean:resources', function () {
    fs.removeSync(globalVar.publicDir);
});